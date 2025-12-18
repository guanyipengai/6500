from datetime import datetime, date
from typing import Optional
import json
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session

from . import schemas
from .auth import generate_otp, verify_otp, create_access_token, get_current_user, get_otp_store_snapshot
from .config import get_settings
from .db import Base, engine, get_db, SessionLocal
from .models import User, Invite, Analysis
from .llm_client import call_llm, build_prompts, extract_json_from_content, calculate_bazi_from_basic_info
from .sms_client import send_verification_code_sms, verify_sms_code

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
  # For development we log the code; in production this will also
  # trigger an SMS via the configured provider (see sms_client).
  print(f"[DEV] Sending verification code {code} to phone {payload.phone}")
  try:
    send_verification_code_sms(payload.phone, code)
  except Exception as exc:  # noqa: BLE001
    # Never crash login because external SMS fails; the OTP remains
    # valid in the in-memory store and can仍然通过调试接口获取。
    print(f"[SMS] Failed to call provider: {exc}")
  return schemas.SendCodeResponse(success=True)


@app.post("/auth/verify-code", response_model=schemas.Token)
def verify_code(payload: schemas.VerifyCodeRequest, db: Session = Depends(get_db)) -> schemas.Token:
  local_ok = verify_otp(payload.phone, payload.code)

  remote_ok = False
  try:
    remote_ok = verify_sms_code(payload.phone, payload.code)
  except Exception as exc:  # noqa: BLE001
    # 远端异常不应影响本地 OTP 逻辑，只做日志记录。
    print(f"[SMS] verify_sms_code raised exception: {exc}")

  if not (local_ok or remote_ok):
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
def get_me(
  request: Request,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> schemas.UserMeResponse:
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

  # Compute public base URL:
  # - If a non-empty base_url is configured, use it as an override.
  # - Otherwise derive it from the incoming request (works for both
  #   localhost during development and the real domain in production).
  if settings.base_url:
    base_url = settings.base_url.rstrip("/")
  else:
    base_url = str(request.base_url).rstrip("/")

  my_referral_url = f"{base_url}/auth?ref={current_user.referral_code}"

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


@app.get("/analysis/latest", response_model=schemas.LatestAnalysisResponse)
def get_latest_analysis(
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> schemas.LatestAnalysisResponse:
  """
  Return the most recent non-error analysis for the current user.
  This is primarily used for prefilling the input form on the profile page.
  """
  analysis = (
    db.query(Analysis)
    .filter(Analysis.user_id == current_user.id)
    .filter(Analysis.status != "error")
    .order_by(Analysis.created_at.desc())
    .first()
  )

  if not analysis:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No analysis found")

  return schemas.LatestAnalysisResponse(
    id=analysis.id,
    status=analysis.status,
    input=analysis.input_json or {},
    created_at=analysis.created_at,
  )


@app.post("/bazi/calc", response_model=schemas.BaziResult)
def calc_bazi(
  payload: schemas.BaziUserInput,
  current_user: User = Depends(get_current_user),
) -> schemas.BaziResult:
  """
  Pre-calculate BaZi chart and Da Yun based on basic profile input.

  This mirrors the first step in the latest reference project so that
  the /profile form can stay simple (只填生日、时间、地点)，而不需要用户自己
  输入干支与大运。
  """
  try:
    raw = calculate_bazi_from_basic_info(payload.model_dump())
  except Exception as exc:  # noqa: BLE001
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"BaZi calculation failed: {exc}",
    ) from exc

  # Attach original user input so the front-end does not need to merge.
  if "userInput" not in raw:
    raw["userInput"] = payload.model_dump()

  return schemas.BaziResult.model_validate(raw)


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
      # 调用大模型失败（超时 / 解析错误 / 网络问题等）时，不再使用本地 exp.json 兜底，
      # 而是明确标记为 error，前端可以据此展示“分析失败”并引导用户重试。
      analysis.status = "error"
      analysis.error_message = f"{exc}"
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


# When running in Docker (或在本地执行 `npm run build` 之后)，我们会有一个
# 编译好的前端产物位于 frontend/dist。这里做两件事：
# 1. 将 dist/assets 挂到 /assets，供静态资源访问；
# 2. 为前端路由（/、/auth、/profile、/bazi/...、/result/...）提供统一的
#    index.html 返回，让 React Router 负责前端路由解析。
FRONTEND_DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


def _read_frontend_index() -> str:
  index_file = FRONTEND_DIST_DIR / "index.html"
  try:
    return index_file.read_text(encoding="utf-8")
  except FileNotFoundError as exc:  # noqa: BLE001
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found") from exc


if FRONTEND_DIST_DIR.exists():
  assets_dir = FRONTEND_DIST_DIR / "assets"
  if assets_dir.exists():
    app.mount(
      "/assets",
      StaticFiles(directory=str(assets_dir)),
      name="frontend-assets",
    )

  title_font = FRONTEND_DIST_DIR / "title.ttf"
  content_font = FRONTEND_DIST_DIR / "content.ttf"
  qrcode_image = FRONTEND_DIST_DIR / "qrcode.jpg"

  if title_font.exists():
    @app.get("/title.ttf", include_in_schema=False)
    def serve_title_font() -> FileResponse:
      return FileResponse(str(title_font), media_type="font/ttf")

  if content_font.exists():
    @app.get("/content.ttf", include_in_schema=False)
    def serve_content_font() -> FileResponse:
      return FileResponse(str(content_font), media_type="font/ttf")

  if qrcode_image.exists():
    @app.get("/qrcode.jpg", include_in_schema=False)
    def serve_qrcode() -> FileResponse:
      return FileResponse(str(qrcode_image), media_type="image/jpeg")

  @app.get("/", include_in_schema=False)
  @app.get("/auth", include_in_schema=False)
  @app.get("/profile", include_in_schema=False)
  @app.get("/bazi/{path:path}", include_in_schema=False)
  @app.get("/result/{path:path}", include_in_schema=False)
  def serve_frontend_app(path: str | None = None) -> HTMLResponse:
    """
    Serve the SPA entrypoint for known frontend routes.

    注意：仅处理 GET 请求，后端 API 如 /auth/send-code 仍由上面的
    FastAPI 路由负责。
    """
    return HTMLResponse(_read_frontend_index())
