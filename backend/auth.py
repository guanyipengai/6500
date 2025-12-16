from datetime import datetime, timedelta
import secrets
from typing import Dict, Tuple

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import User

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/verify-code")

# Simple in-memory store for one-time codes.
# This is sufficient for development and local testing.
_otp_store: Dict[str, Tuple[str, datetime]] = {}


def generate_otp(phone: str) -> str:
  code = f"{secrets.randbelow(1_000_000):06d}"
  expires_at = datetime.utcnow() + timedelta(minutes=10)
  _otp_store[phone] = (code, expires_at)
  return code


def verify_otp(phone: str, code: str) -> bool:
  stored = _otp_store.get(phone)
  if not stored:
    return False
  real_code, expires_at = stored
  if datetime.utcnow() > expires_at:
    return False
  return secrets.compare_digest(real_code, code)


def create_access_token(user_id: int) -> str:
  expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expires_minutes)
  to_encode = {"sub": str(user_id), "exp": expire}
  encoded = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
  return encoded


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
  if not token:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Missing authentication token",
      headers={"WWW-Authenticate": "Bearer"},
    )

  try:
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    sub = payload.get("sub")
    if sub is None:
      raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user_id = int(sub)
  except (jwt.PyJWTError, ValueError):
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid authentication token",
      headers={"WWW-Authenticate": "Bearer"},
    )

  user = db.get(User, user_id)
  if not user:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
  return user


def get_otp_store_snapshot() -> Dict[str, Tuple[str, datetime]]:
  """
  Helper for tests: returns a shallow copy of the current OTP store.
  """
  return dict(_otp_store)

