from datetime import datetime
from typing import Optional, Dict, Any

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


class AnalysisInput(BaseModel):
  """
  Input fields for creating an analysis task.

  Mirrors the essential parts of the previous front-end UserInput,
  but without exposing model/apiKey settings to users.
  """

  name: Optional[str] = None
  gender: str = Field(..., description="Male or Female")
  birth_year: int
  year_pillar: str
  month_pillar: str
  day_pillar: str
  hour_pillar: str
  start_age: int
  first_da_yun: str


class AnalysisCreateResponse(BaseModel):
  id: int
  status: str


class AnalysisDetail(BaseModel):
  id: int
  status: str
  input: Dict[str, Any]
  output: Optional[Dict[str, Any]] = None
  error_message: Optional[str] = None
  created_at: datetime
  completed_at: Optional[datetime] = None
