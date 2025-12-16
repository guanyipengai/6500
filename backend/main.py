from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import schemas
from .auth import generate_otp, verify_otp, create_access_token, get_current_user
from .config import get_settings
from .db import Base, engine, get_db
from .models import User, Invite

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Life Bull Market API", version="0.1.0")


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

  # Quota fields will be fully implemented in later stages.
  # For now, return a simple baseline that front-end can integrate with.
  today_base_quota = 5
  today_extra_quota = 0
  today_used = 0
  today_remaining = today_base_quota + today_extra_quota - today_used

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

