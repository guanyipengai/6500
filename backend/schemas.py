from datetime import datetime
from typing import Optional, Dict, Any, List

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

  # Optional original birth information (newer flow).
  # These fields are not used directly in the LLM prompt today, but they
  # allow us to keep the profile form aligned with the latest reference
  # project and to prefill the form from the backend history.
  birthDate: Optional[str] = Field(default=None, description="Birth date in YYYY-MM-DD format")
  birthTime: Optional[str] = Field(default=None, description="Birth time in HH:MM format")
  birthLocation: Optional[str] = Field(default=None, description="Birth place text as provided by user")


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


class LatestAnalysisResponse(BaseModel):
  id: int
  status: str
  input: AnalysisInput
  created_at: datetime


class BaziUserInput(BaseModel):
  """
  Basic user input for BaZi calculation.

  Field names intentionally follow the latest reference front-end (camelCase)
  so the JSON payloads can stay aligned across projects.
  """

  name: Optional[str] = None
  gender: str = Field(..., description="Male or Female")
  birthDate: str = Field(..., description="Birth date in YYYY-MM-DD format")
  birthTime: str = Field(..., description="Birth time in HH:MM format")
  birthLocation: str = Field(..., description="Birth place (free text, city or region)")


class BaziPillar(BaseModel):
  gan: str
  zhi: str
  element: Optional[str] = None


class BaziChart(BaseModel):
  year: BaziPillar
  month: BaziPillar
  day: BaziPillar
  hour: BaziPillar


class BaziResult(BaseModel):
  """
  Result of the BaZi pre-calculation step.

  Matches the structure used in reference/lifeline-k--main.
  """

  userInput: BaziUserInput
  solarTime: str
  lunarDate: str
  bazi: BaziChart
  startAge: int
  direction: str
  daYun: List[str]
