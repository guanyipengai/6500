from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import schemas
from .auth import generate_otp, verify_otp, create_access_token, get_current_user, get_otp_store_snapshot
from .config import get_settings
from .db import Base, engine, get_db, SessionLocal
from .models import User, Invite, Analysis
from .llm_client import call_llm, build_prompts, extract_json_from_content

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Life Bull Market API", version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


def _generate_unique_referral_code(db: Session) -> str:
  import secrets
  import string

  alphabet = string.ascii_uppercase + string.digits

  while True:
    code = "".join(secrets.choice(alphabet) for _ in range(6))
    existing = db.query(User).filter(User.referral_code == code).first()
    if not existing:
      return code


@app.post("/auth/send-code", response_model=schemas.SendCodeResponse)
def send_code(payload: schemas.SendCodeRequest) -> schemas.SendCodeResponse:
  code = generate_otp(payload.phone)
  # For development we log the code; in production this would call an SMS provider.
  print(f"[DEV] Sending verification code {code} to phone {payload.phone}")
  return schemas.SendCodeResponse(success=True)


@app.post("/auth/verify-code", response_model=schemas.Token)
def verify_code(payload: schemas.VerifyCodeRequest, db: Session = Depends(get_db)) -> schemas.Token:
  if not verify_otp(payload.phone, payload.code):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

  user = db.query(User).filter(User.phone == payload.phone).first()
  is_new_user = False

  if not user:
    is_new_user = True
    referral_code = _generate_unique_referral_code(db)
    inviter_code: Optional[str] = payload.inviterCode

    user = User(
      phone=payload.phone,
      referral_code=referral_code,
      inviter_code=inviter_code,
      created_at=datetime.utcnow(),
      last_login_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()  # Ensure user.id is available

    # Record successful invite if inviter_code is valid
    if inviter_code:
      inviter = db.query(User).filter(User.referral_code == inviter_code).first()
      if inviter and inviter.id != user.id:
        invite = Invite(inviter_user_id=inviter.id, invited_user_id=user.id, created_at=datetime.utcnow())
        db.add(invite)
  else:
    user.last_login_at = datetime.utcnow()

  db.commit()

  if is_new_user:
    print(f"[DEV] Created new user {user.id} with phone {user.phone} and referral_code {user.referral_code}")

  token = create_access_token(user_id=user.id)
  return schemas.Token(access_token=token)


@app.get("/debug/otp-store")
def debug_get_otp_store() -> dict:
  """
  Development helper endpoint to inspect in-memory OTP codes.

  WARNING: do not expose this in a production deployment.
  """
  snapshot = get_otp_store_snapshot()
  return {
    phone: {
      "code": code,
      "expires_at": expires_at.isoformat(),
    }
    for phone, (code, expires_at) in snapshot.items()
  }


@app.get("/user/me", response_model=schemas.UserMeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> schemas.UserMeResponse:
  # Basic invite statistics
  total_invited = db.query(Invite).filter(Invite.inviter_user_id == current_user.id).count()

  today = date.today()
  invited_today = (
    db.query(Invite)
    .filter(Invite.inviter_user_id == current_user.id)
    .filter(Invite.created_at >= datetime(today.year, today.month, today.day))
    .count()
  )

  today_base_quota = 5

  # Extra quota based on successful invites:
  # every 5 successful invites grants +1 extra, capped at +10 per day.
  # For now we use totalInvited as a simple approximation; later we can
  # refine this to use "completed analyses of invited users".
  extra_by_invites = total_invited // 5
  today_extra_quota = min(extra_by_invites, 10)

  # Count today's completed analyses
  analyses_today_done = (
    db.query(Analysis)
    .filter(Analysis.user_id == current_user.id)
    .filter(Analysis.status == "done")
    .filter(Analysis.created_at >= datetime(today.year, today.month, today.day))
    .count()
  )

  today_used = analyses_today_done
  today_remaining = max(today_base_quota + today_extra_quota - today_used, 0)

  my_referral_url = f"{settings.base_url}/auth?ref={current_user.referral_code}"

  return schemas.UserMeResponse(
    user=current_user,
    todayBaseQuota=today_base_quota,
    todayExtraQuota=today_extra_quota,
    todayUsed=today_used,
    todayRemaining=today_remaining,
    totalInvited=total_invited,
    invitedToday=invited_today,
    myReferralUrl=my_referral_url,
  )


def _run_analysis_background(analysis_id: int) -> None:
  """
  Background task: call LLM and update the Analysis record.
  """
  db = SessionLocal()
  try:
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
      return

    system_prompt, user_prompt = build_prompts(analysis.input_json or {})
    try:
      content = call_llm(system_prompt, user_prompt)
      output = extract_json_from_content(content)
      analysis.output_json = output
      analysis.status = "done"
      analysis.error_message = None
      analysis.completed_at = datetime.utcnow()
    except Exception as exc:  # noqa: BLE001
      analysis.status = "error"
      analysis.error_message = str(exc)
      analysis.completed_at = datetime.utcnow()

    db.commit()
  finally:
    db.close()


@app.post("/analysis", response_model=schemas.AnalysisCreateResponse)
def create_analysis(
  payload: schemas.AnalysisInput,
  background_tasks: BackgroundTasks,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> schemas.AnalysisCreateResponse:
  today = date.today()

  # Compute today's quotas for this user
  today_base_quota = 5

  total_invited = db.query(Invite).filter(Invite.inviter_user_id == current_user.id).count()
  extra_by_invites = total_invited // 5
  today_extra_quota = min(extra_by_invites, 10)

  analyses_today_done = (
    db.query(Analysis)
    .filter(Analysis.user_id == current_user.id)
    .filter(Analysis.status == "done")
    .filter(Analysis.created_at >= datetime(today.year, today.month, today.day))
    .count()
  )

  today_used = analyses_today_done
  today_remaining = today_base_quota + today_extra_quota - today_used

  if today_remaining <= 0:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="今日测算次数已用完，请明天再试或通过邀请获得更多次数。",
    )

  analysis = Analysis(
    user_id=current_user.id,
    input_json=payload.model_dump(),
    status="pending",
    created_at=datetime.utcnow(),
  )
  db.add(analysis)
  db.commit()
  db.refresh(analysis)

  background_tasks.add_task(_run_analysis_background, analysis.id)

  return schemas.AnalysisCreateResponse(id=analysis.id, status=analysis.status)


@app.get("/analysis/{analysis_id}", response_model=schemas.AnalysisDetail)
def get_analysis(
  analysis_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> schemas.AnalysisDetail:
  analysis = db.get(Analysis, analysis_id)
  if not analysis or analysis.user_id != current_user.id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

  return schemas.AnalysisDetail(
    id=analysis.id,
    status=analysis.status,
    input=analysis.input_json or {},
    output=analysis.output_json,
    error_message=analysis.error_message,
    created_at=analysis.created_at,
    completed_at=analysis.completed_at,
  )
