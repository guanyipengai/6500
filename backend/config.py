import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass
class Settings:
  """
  Simple configuration object.

  Values can be overridden via:
  1. local-config.json (backend/local-config.json)
  2. environment variables with prefix APP_
  """

  database_url: str = "sqlite:///./backend.db"
  secret_key: str = "dev-secret"
  algorithm: str = "HS256"
  access_token_expires_minutes: int = 60 * 24 * 7
  base_url: str = "http://localhost:8000"

  # LLM configuration (SiliconFlow)
  llm_api_base: str = "https://api.siliconflow.cn/v1/chat/completions"
  llm_api_key: str = ""
  llm_model: str = "Qwen/Qwen3-30B-A3B-Instruct-2507"


def _apply_local_config(settings: Settings) -> None:
  """
  Load backend/local-config.json if present and override selected fields.

  Example backend/local-config.json:
  {
    "llm_api_key": "sk-...",
    "llm_api_base": "https://api.siliconflow.cn/v1/chat/completions",
    "llm_model": "Qwen/Qwen3-30B-A3B-Instruct-2507"
  }
  """
  cfg_path = Path(__file__).resolve().parent / "local-config.json"
  if not cfg_path.exists():
    return

  try:
    data = json.loads(cfg_path.read_text(encoding="utf-8"))
  except Exception:
    return

  if not isinstance(data, dict):
    return

  # Currently我们只从本地文件读取 LLM 相关配置，避免误改数据库等敏感设置
  for field in ("llm_api_key", "llm_api_base", "llm_model"):
    if field in data and data[field]:
      setattr(settings, field, str(data[field]))


def _apply_env_overrides(settings: Settings) -> None:
  """
  Apply environment variables with APP_ prefix on top.
  """
  mapping = {
    "database_url": "APP_DATABASE_URL",
    "secret_key": "APP_SECRET_KEY",
    "algorithm": "APP_ALGORITHM",
    "access_token_expires_minutes": "APP_ACCESS_TOKEN_EXPIRES_MINUTES",
    "base_url": "APP_BASE_URL",
    "llm_api_base": "APP_LLM_API_BASE",
    "llm_api_key": "APP_LLM_API_KEY",
    "llm_model": "APP_LLM_MODEL",
  }

  for attr, env_name in mapping.items():
    value = os.getenv(env_name)
    if value is None or value == "":
      continue
    if attr == "access_token_expires_minutes":
      try:
        setattr(settings, attr, int(value))
      except ValueError:
        continue
    else:
      setattr(settings, attr, value)


@lru_cache
def get_settings() -> Settings:
  s = Settings()
  _apply_local_config(s)
  _apply_env_overrides(s)
  return s
