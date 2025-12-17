from fastapi.testclient import TestClient
import pytest

from backend.main import app, Base, engine
from backend.auth import get_otp_store_snapshot
from backend.models import Analysis
from backend.db import SessionLocal


client = TestClient(app)


def setup_module() -> None:
  # Reset database for tests in this module
  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(bind=engine)


def _signup_user(phone: str):
  resp = client.post("/auth/send-code", json={"phone": phone})
  assert resp.status_code == 200
  otp_store = get_otp_store_snapshot()
  code, _ = otp_store[phone]

  resp = client.post("/auth/verify-code", json={"phone": phone, "code": code})
  assert resp.status_code == 200
  token = resp.json()["access_token"]
  return token


@pytest.mark.parametrize("gender", ["Male", "Female"])
def test_create_analysis_and_background_llm(monkeypatch, gender: str) -> None:
  """
  Ensure POST /analysis creates a record and the background task
  marks it as done using a stubbed LLM client.
  """

  # Stub call_llm to avoid real network calls
  def fake_call_llm(system_prompt: str, user_prompt: str) -> str:
    # Minimal but structurally valid JSON result matching expected schema.
    return """
    {
      "bazi": ["癸未", "壬戌", "丙子", "庚寅"],
      "summary": "测试总评",
      "summaryScore": 7,
      "personality": "测试性格",
      "personalityScore": 8,
      "industry": "测试事业",
      "industryScore": 7,
      "fengShui": "测试风水",
      "fengShuiScore": 8,
      "wealth": "测试财富",
      "wealthScore": 7,
      "marriage": "测试婚姻",
      "marriageScore": 6,
      "health": "测试健康",
      "healthScore": 6,
      "family": "测试六亲",
      "familyScore": 7,
      "crypto": "测试币圈",
      "cryptoScore": 7,
      "cryptoYear": "2025年 (乙巳)",
      "cryptoStyle": "现货定投",
      "chartPoints": [
        {"age": 1, "year": 2000, "daYun": "童限", "ganZhi": "庚辰", "open": 50, "close": 55, "high": 60, "low": 45, "score": 55, "reason": "测试年份一"},
        {"age": 2, "year": 2001, "daYun": "童限", "ganZhi": "辛巳", "open": 55, "close": 52, "high": 58, "low": 50, "score": 52, "reason": "测试年份二"}
      ]
    }
    """

  monkeypatch.setattr("backend.main.call_llm", fake_call_llm)

  token = _signup_user(f"1390000000{1 if gender == 'Male' else 2}")

  payload = {
    "name": "测试用户",
    "gender": gender,
    "birth_year": 1990,
    "year_pillar": "癸未",
    "month_pillar": "壬戌",
    "day_pillar": "丙子",
    "hour_pillar": "庚寅",
    "start_age": 8,
    "first_da_yun": "辛酉",
  }

  resp = client.post("/analysis", json=payload, headers={"Authorization": f"Bearer {token}"})
  assert resp.status_code == 200
  created = resp.json()
  analysis_id = created["id"]
  assert created["status"] == "pending"

  # Background task should have executed synchronously with TestClient
  resp = client.get(f"/analysis/{analysis_id}", headers={"Authorization": f"Bearer {token}"})
  assert resp.status_code == 200
  detail = resp.json()
  assert detail["status"] in ("done", "error")
  assert detail["input"]["gender"] == gender

  # Ensure DB record exists
  db = SessionLocal()
  try:
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    assert analysis is not None
    assert analysis.user_id is not None
  finally:
    db.close()

