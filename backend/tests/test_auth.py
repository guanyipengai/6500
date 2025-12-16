from datetime import date

from fastapi.testclient import TestClient

from backend.main import app, Base, engine
from backend.auth import get_otp_store_snapshot
from backend.models import User, Invite
from backend.db import SessionLocal


client = TestClient(app)


def setup_module() -> None:
  # Reset database for tests
  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(bind=engine)


def _get_db_session():
  return SessionLocal()


def test_signup_and_invite_flow() -> None:
  phone_inviter = "13800000001"
  phone_invited = "13800000002"

  # Step 1: inviter sends code and signs up
  resp = client.post("/auth/send-code", json={"phone": phone_inviter})
  assert resp.status_code == 200
  otp_store = get_otp_store_snapshot()
  code_inviter, _ = otp_store[phone_inviter]

  resp = client.post(
    "/auth/verify-code",
    json={
      "phone": phone_inviter,
      "code": code_inviter,
    },
  )
  assert resp.status_code == 200
  token_inviter = resp.json()["access_token"]
  assert token_inviter

  # Get inviter info and referral code
  resp = client.get("/user/me", headers={"Authorization": f"Bearer {token_inviter}"})
  assert resp.status_code == 200
  me_data = resp.json()
  referral_code = me_data["user"]["referral_code"]
  assert referral_code
  assert me_data["totalInvited"] == 0

  # Step 2: invited user signs up using inviter's referral code
  resp = client.post("/auth/send-code", json={"phone": phone_invited})
  assert resp.status_code == 200
  otp_store = get_otp_store_snapshot()
  code_invited, _ = otp_store[phone_invited]

  resp = client.post(
    "/auth/verify-code",
    json={
      "phone": phone_invited,
      "code": code_invited,
      "inviterCode": referral_code,
    },
  )
  assert resp.status_code == 200

  # Step 3: inviter's stats should reflect one successful invite
  resp = client.get("/user/me", headers={"Authorization": f"Bearer {token_inviter}"})
  assert resp.status_code == 200
  me_data = resp.json()
  assert me_data["totalInvited"] == 1

  # Ensure invite record exists in DB
  db = _get_db_session()
  try:
    inviter = db.query(User).filter(User.phone == phone_inviter).first()
    invited = db.query(User).filter(User.phone == phone_invited).first()
    assert inviter is not None
    assert invited is not None

    invites = (
      db.query(Invite)
      .filter(Invite.inviter_user_id == inviter.id)
      .filter(Invite.invited_user_id == invited.id)
      .all()
    )
    assert len(invites) == 1
  finally:
    db.close()
