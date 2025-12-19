from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path
from typing import Set


@lru_cache
def get_initial_invite_codes() -> Set[str]:
  """
  Load the initial invite-code pool from CSV.

  - File location: backend/initial_invite_codes.csv
  - CSV format: first column is the code, header row optional.
  - Returned as an uppercased set for O(1) membership checks.

  If the file is missing or malformed, this function falls back to an empty set
  so that正常登录流程不会因为配置问题完全中断。
  """
  path = Path(__file__).resolve().parent / "initial_invite_codes.csv"
  codes: Set[str] = set()

  if not path.exists():
    return codes

  try:
    with path.open("r", encoding="utf-8", newline="") as f:
      reader = csv.reader(f)
      for row in reader:
        if not row:
          continue
        raw = row[0].strip()
        if not raw or raw.lower() == "code":
          continue
        codes.add(raw.upper())
  except Exception:
    # 配置错误时宁可退化为“无初始邀请码池”，也不要影响整体登录。
    return set()

  return codes

