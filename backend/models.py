from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from .db import Base


class User(Base):
  __tablename__ = "users"

  id = Column(Integer, primary_key=True, index=True)
  phone = Column(String(32), unique=True, index=True, nullable=False)
  referral_code = Column(String(32), unique=True, index=True, nullable=False)
  inviter_code = Column(String(32), index=True, nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  last_login_at = Column(DateTime, default=datetime.utcnow, nullable=False)

  invites = relationship(
    "Invite",
    back_populates="inviter",
    foreign_keys="Invite.inviter_user_id",
    cascade="all, delete-orphan",
  )
  invited_by = relationship(
    "Invite",
    back_populates="invited",
    foreign_keys="Invite.invited_user_id",
    cascade="all, delete-orphan",
  )

  analyses = relationship(
    "Analysis",
    back_populates="user",
    cascade="all, delete-orphan",
  )


class Invite(Base):
  __tablename__ = "invites"

  id = Column(Integer, primary_key=True, index=True)
  inviter_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
  invited_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

  inviter = relationship("User", foreign_keys=[inviter_user_id], back_populates="invites")
  invited = relationship("User", foreign_keys=[invited_user_id], back_populates="invited_by")


class Analysis(Base):
  __tablename__ = "analyses"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

  input_json = Column(JSON, nullable=False)
  output_json = Column(JSON, nullable=True)

  status = Column(String(20), nullable=False, default="pending")
  error_message = Column(String(512), nullable=True)

  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  completed_at = Column(DateTime, nullable=True)

  user = relationship("User", back_populates="analyses")
