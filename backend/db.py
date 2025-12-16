from typing import Generator, Dict, Any

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

from .config import get_settings


settings = get_settings()

connect_args: Dict[str, Any] = {}
if settings.database_url.startswith("sqlite"):
  # Needed for SQLite to allow usage in different threads (e.g. TestClient)
  connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()

