#!/usr/bin/env python
"""
临时脚本：测量当前 LLM 调用一次完整人生牛市分析 prompt 的耗时。

用法（在项目根目录执行）：

  python test_llm_latency.py

脚本会：
  - 从 backend/config.py 读取 llm_api_base / llm_api_key / llm_model；
  - 从 llm-prompt-sample.txt 中解析 system/user 两段 prompt；
  - 调用 OpenAI 兼容接口一次，并打印耗时与 token 使用情况。

注意：
  - 不会做任何写库操作，只是单次请求；
  - 请确认 backend/local-config.json 中已经配置好 llm_api_base / llm_api_key / llm_model。
"""

from __future__ import annotations

import os
import time
from pathlib import Path

from openai import OpenAI

from backend.config import get_settings


PROMPT_FILE = Path("llm-prompt-sample.txt")


def load_prompts_from_file(path: Path) -> tuple[str, str]:
  if not path.exists():
    raise FileNotFoundError(f"Prompt file not found: {path}")

  text = path.read_text(encoding="utf-8")
  sys_marker = "=== SYSTEM PROMPT ==="
  user_marker = "=== USER PROMPT ==="

  sys_idx = text.find(sys_marker)
  user_idx = text.find(user_marker)

  if sys_idx == -1 or user_idx == -1:
    raise ValueError("Prompt file format is invalid; markers not found.")

  sys_start = sys_idx + len(sys_marker)
  system_prompt = text[sys_start:user_idx].strip()
  user_prompt = text[user_idx + len(user_marker) :].strip()
  return system_prompt, user_prompt


def main() -> None:
  settings = get_settings()

  api_key = getattr(settings, "llm_api_key", None) or os.getenv("ARK_API_KEY")
  api_base = getattr(settings, "llm_api_base", None) or "https://ark.cn-beijing.volces.com/api/v3"
  model = getattr(settings, "llm_model", None) or "doubao-seed-1-6-251015"

  if not api_key:
    raise SystemExit("LLM API key 未配置，请在 backend/local-config.json 或环境变量中设置。")

  system_prompt, user_prompt = load_prompts_from_file(PROMPT_FILE)

  client = OpenAI(api_key=api_key, base_url=api_base)

  max_tokens = getattr(settings, "llm_max_tokens", 8192)

  common_kwargs = {
    "model": model,
    "messages": [
      {"role": "system", "content": system_prompt},
      {"role": "user", "content": user_prompt},
    ],
    "temperature": 0.7,
    "max_tokens": max_tokens,
  }

  print(f"Using base_url={api_base}, model={model}, max_tokens={max_tokens}")
  print(f"System prompt length: {len(system_prompt)} chars")
  print(f"User prompt length:   {len(user_prompt)} chars")

  t0 = time.perf_counter()
  try:
    # 尝试带 response_format（和正式代码一致）
    completion = client.chat.completions.create(
      **common_kwargs,
      response_format={"type": "json_object"},
    )
  except Exception as exc:
    # 如果后端不支持 response_format，就降级为普通调用，便于比较纯延迟。
    print(f"First call with response_format failed: {exc!r}, retrying without response_format...")
    completion = client.chat.completions.create(**common_kwargs)
  t1 = time.perf_counter()

  elapsed = t1 - t0
  print(f"\nLLM 调用耗时: {elapsed:.2f} 秒")

  usage = getattr(completion, "usage", None)
  if usage is not None:
    print(
      f"Token 使用: prompt={usage.prompt_tokens}, "
      f"completion={usage.completion_tokens}, total={usage.total_tokens}"
    )

  message = completion.choices[0].message
  content = message.content
  if isinstance(content, list):
    # openai>=1.* 可能返回 content-part 列表，这里简单拼接展示前几百个字符。
    parts = []
    for part in content:
      text = getattr(part, "text", None)
      if isinstance(text, str):
        parts.append(text)
    content_str = "".join(parts)
  else:
    content_str = content or ""

  print("\n返回内容前 400 字符预览：")
  preview = content_str[:400]
  print(preview)
  if len(content_str) > 400:
    print("... (已截断)")


if __name__ == "__main__":
  main()
