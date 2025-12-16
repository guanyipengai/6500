from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class SendCodeRequest(BaseModel):
  phone: str = Field(..., description="User phone number (login identifier)")


class SendCodeResponse(BaseModel):
  success: bool = True


class VerifyCodeRequest(BaseModel):
  phone: str
  code: str
  inviterCode: Optional[str] = Field(default=None, description="Optional inviter referral code")


class Token(BaseModel):
  access_token: str
  token_type: str = "bearer"


class UserMe(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  phone: str
  referral_code: str
  inviter_code: Optional[str]
  created_at: datetime
  last_login_at: datetime


class UserMeResponse(BaseModel):
  user: UserMe
  todayBaseQuota: int
  todayExtraQuota: int
  todayUsed: int
  todayRemaining: int
  totalInvited: int
  invitedToday: int
  myReferralUrl: str
