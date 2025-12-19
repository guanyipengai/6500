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
  # Optional public base URL for generating links (e.g. referral URLs).
  # When left empty, the application will derive the base URL from the
  # incoming HTTP request (request.base_url), so you usually do not need
  # to change this between development and production.
  base_url: str = ""

  # LLM configuration (Doubao / Ark, OpenAI-compatible)
  # 默认对接火山方舟 OpenAI 兼容接口，可通过环境变量覆盖：
  # - APP_LLM_API_BASE / APP_LLM_API_KEY / APP_LLM_MODEL
  # 同时也兼容官方示例中的 ARK_API_KEY 环境变量。
  llm_api_base: str = "https://ark.cn-beijing.volces.com/api/v3"
  llm_api_key: str = ""
  llm_model: str = "doubao-seed-1-6-251015"
  # 最大生成 token 数，控制大模型一次回答的长度。
  # 可以通过 backend/local-config.json 或 APP_LLM_MAX_TOKENS 覆盖。
  llm_max_tokens: int = 8192

  # SMS configuration (Alibaba Cloud Dypnsapi)
  # When sms_sign_name and sms_template_code are non-empty and the
  # Alibaba Cloud SDK is installed, the backend will attempt to send
  # verification codes via SMS in addition to the in-memory OTP store.
  # 默认使用项目说明中的示例配置，只需更换手机号即可。
  # 对于 AccessKeyId/Secret，建议仅在本地的 backend/local-config.json
  # 或环境变量中配置，避免提交到版本库。
  sms_access_key_id: str = ""
  sms_access_key_secret: str = ""
  sms_sign_name: str = "速通互联验证码"
  sms_template_code: str = "100001"
  # Template for `template_param`, where `##code##` will be replaced
  # with the generated verification code.
  sms_template_param_template: str = '{"code":"##code##","min":"5"}'


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

  # Currently我们只从本地文件读取 LLM 相关配置、base_url 和 SMS 配置，
  # 避免误改数据库等敏感设置。
  for field in (
    "llm_api_key",
    "llm_api_base",
    "llm_model",
    "llm_max_tokens",
    "base_url",
    "sms_access_key_id",
    "sms_access_key_secret",
    "sms_sign_name",
    "sms_template_code",
    "sms_template_param_template",
  ):
    if field in data and data[field]:
      value = data[field]
      if field == "llm_max_tokens":
        try:
          settings.llm_max_tokens = int(value)
        except (TypeError, ValueError):
          # 非法值时忽略，保留默认 8192
          pass
      else:
        setattr(settings, field, str(value))


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
    "llm_max_tokens": "APP_LLM_MAX_TOKENS",
    "sms_access_key_id": "APP_SMS_ACCESS_KEY_ID",
    "sms_access_key_secret": "APP_SMS_ACCESS_KEY_SECRET",
    "sms_sign_name": "APP_SMS_SIGN_NAME",
    "sms_template_code": "APP_SMS_TEMPLATE_CODE",
    "sms_template_param_template": "APP_SMS_TEMPLATE_PARAM_TEMPLATE",
  }

  for attr, env_name in mapping.items():
    value = os.getenv(env_name)
    if value is None or value == "":
      continue
    if attr in ("access_token_expires_minutes", "llm_max_tokens"):
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
