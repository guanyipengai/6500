"""
Thin wrapper around Alibaba Cloud Dypnsapi SMS service.

This module is optional: if the relevant SDK is not installed or the
configuration is incomplete, calling send_verification_code_sms will
log a message and return without raising, while the in-memory OTP
mechanism in backend.auth continues工作正常。
"""

from __future__ import annotations

from typing import Optional

from .config import get_settings

settings = get_settings()


try:
  # Import Alibaba Cloud SDKs once at module import time.
  from alibabacloud_dypnsapi20170525.client import (  # type: ignore[import]
    Client as Dypnsapi20170525Client,
  )
  from alibabacloud_credentials.client import (  # type: ignore[import]
    Client as CredentialClient,
  )
  from alibabacloud_tea_openapi import models as open_api_models  # type: ignore[import]
  from alibabacloud_dypnsapi20170525 import (  # type: ignore[import]
    models as dypnsapi_20170525_models,
  )
  from alibabacloud_tea_util import models as util_models  # type: ignore[import]
except Exception as exc:  # noqa: BLE001
  # SDK 未安装时，直接记录日志，后续调用会走本地 OTP，而不会中断登录流程。
  print(f"[SMS] Alibaba Cloud SMS SDK not available during import: {exc}")
  Dypnsapi20170525Client = None  # type: ignore[assignment]
  CredentialClient = None  # type: ignore[assignment]
  open_api_models = None  # type: ignore[assignment]
  dypnsapi_20170525_models = None  # type: ignore[assignment]
  util_models = None  # type: ignore[assignment]


_sms_client: Optional["Dypnsapi20170525Client"] = None


def _ensure_client() -> Optional["Dypnsapi20170525Client"]:
  """
  Lazily create a shared SMS client.

  关键点：client 在模块导入后的第一次调用中于主线程创建，
  避免在 FastAPI 的线程池工作线程中触发 APScheduler 的 signal 限制。
  """
  global _sms_client

  if _sms_client is not None:
    return _sms_client

  try:
    if not settings.sms_sign_name or not settings.sms_template_code:
      print("[SMS] sms_sign_name or sms_template_code not configured; skip provider call.")
      return None

    if not settings.sms_access_key_id or not settings.sms_access_key_secret:
      print("[SMS] sms_access_key_id or sms_access_key_secret not configured; skip provider call.")
      return None

    if Dypnsapi20170525Client is None or open_api_models is None:
      # SDK import failed earlier.
      return None

    # 使用配置文件/环境变量中显式提供的 AccessKeyId/Secret，
    # 避免走默认的 CredentialClient，从而减少元数据查询和代理超时。
    config = open_api_models.Config(  # type: ignore[call-arg]
      access_key_id=settings.sms_access_key_id,
      access_key_secret=settings.sms_access_key_secret,
    )
    config.endpoint = "dypnsapi.aliyuncs.com"
    client = Dypnsapi20170525Client(config)
    _sms_client = client
    print("[SMS] Initialized Alibaba Cloud SMS client.")
    return _sms_client
  except Exception as exc:  # noqa: BLE001
    print(f"[SMS] Failed to initialize SMS client: {exc}")
    _sms_client = None
    return None


def send_verification_code_sms(phone: str, code: str) -> None:
  """
  Send an SMS verification code via Alibaba Cloud, if configured.

  - Uses Settings from config (which can be overridden by local-config.json).
  - Expects the template param to contain a placeholder '##code##'
    which will be replaced with the generated OTP.

  Any import errors or runtime errors are logged to stdout and then swallowed
  so that本地开发和测试不会因为外部短信服务不可用而完全中断。
  """
  client = _ensure_client()
  if client is None:
    return

  try:
    template_param = (
      settings.sms_template_param_template.replace("##code##", code)
      if settings.sms_template_param_template
      else f'{{"code":"{code}","min":"5"}}'
    )

    request = dypnsapi_20170525_models.SendSmsVerifyCodeRequest(  # type: ignore[call-arg]
      phone_number=phone,
      sign_name=settings.sms_sign_name,
      template_code=settings.sms_template_code,
      template_param=template_param,
    )
    runtime = util_models.RuntimeOptions()  # type: ignore[call-arg]

    resp = client.send_sms_verify_code_with_options(request, runtime)
    print("[SMS] send_sms_verify_code response:", resp)
  except Exception as error:  # noqa: BLE001
    # 在工程中可以根据需要把错误接入监控，这里只做简单打印。
    message = getattr(error, "message", None) or str(error)
    print("[SMS] send_sms_verify_code failed:", message)


def verify_sms_code(phone: str, code: str) -> bool:
  """
  Verify a code via Alibaba Cloud SMS service, if configured.

  返回值说明：
  - True: 远端校验明确通过。
  - False: 远端校验失败、抛异常或当前未配置/未安装 SDK。

  上层调用方可以将其与本地 OTP 校验做“或”逻辑：
    local_ok or verify_sms_code(...)
  """
  client = _ensure_client()
  if client is None:
    return False

  try:
    request = dypnsapi_20170525_models.CheckSmsVerifyCodeRequest(  # type: ignore[call-arg]
      phone_number=phone,
      verify_code=code,
    )
    runtime = util_models.RuntimeOptions()  # type: ignore[call-arg]

    resp = client.check_sms_verify_code_with_options(request, runtime)
    print("[SMS] check_sms_verify_code response:", resp)

    # 尝试读取通用的 "code" 字段（大多阿里云 OpenAPI 返回 "OK" 表示成功）。
    body = getattr(resp, "body", None)
    result_code = getattr(body, "code", None)
    if result_code and str(result_code).upper() == "OK":
      return True

    # 如果结构不同，我们保持严格策略：看不到明确的 OK，就视为未通过。
    return False
  except Exception as error:  # noqa: BLE001
    message = getattr(error, "message", None) or str(error)
    print("[SMS] check_sms_verify_code failed:", message)
    return False


# 尝试在模块导入阶段提前初始化一次 client，这时运行在主线程，
# 可以避免 APScheduler 在工作线程里使用 signal 导致的报错。
try:
  _ensure_client()
except Exception as exc:  # noqa: BLE001
  print(f"[SMS] Initial client warm-up failed (will retry lazily): {exc}")
