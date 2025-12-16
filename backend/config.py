import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass
class Settings:
  """
  Simple configuration object.

  Values can be overridden via environment variables with prefix APP_.
  For example:
    APP_DATABASE_URL=postgresql://...
  """

  database_url: str = os.getenv("APP_DATABASE_URL", "sqlite:///./backend.db")
  secret_key: str = os.getenv("APP_SECRET_KEY", "dev-secret")
  algorithm: str = os.getenv("APP_ALGORITHM", "HS256")
  access_token_expires_minutes: int = int(os.getenv("APP_ACCESS_TOKEN_EXPIRES_MINUTES", str(60 * 24 * 7)))
  base_url: str = os.getenv("APP_BASE_URL", "http://localhost:8000")


@lru_cache
def get_settings() -> Settings:
  return Settings()
