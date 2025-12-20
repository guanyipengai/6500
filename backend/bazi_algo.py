from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple


BASE_DIR = Path(__file__).resolve().parent
PHP_CALENDAR_PATH = BASE_DIR / "bazi-master" / "CalendarController.class.php"


def _extract_php_array(name: str) -> List[Any]:
  """
  Extract a PHP array literal from CalendarController.class.php and
  evaluate it as a Python list.

  We only use this for static constant tables (lunarInfo, solarMonth, etc.).
  """
  if not PHP_CALENDAR_PATH.exists():
    raise RuntimeError(f"BaZi PHP calendar file not found: {PHP_CALENDAR_PATH}")

  text = PHP_CALENDAR_PATH.read_text(encoding="utf-8")
  marker = f"$this->{name} = ["
  idx = text.find(marker)
  if idx == -1:
    raise RuntimeError(f"Cannot find PHP array {name} in {PHP_CALENDAR_PATH}")

  start = text.find("[", idx)
  end = text.find("];", start)
  if start == -1 or end == -1:
    raise RuntimeError(f"Malformed PHP array {name} in {PHP_CALENDAR_PATH}")

  array_literal = text[start : end + 1]
  # Strip inline comments like "// 1900-1909"
  lines = []
  for line in array_literal.splitlines():
    if "//" in line:
      line = line.split("//", 1)[0]
    lines.append(line)
  cleaned = "\n".join(lines)

  # Evaluate as a Python literal. The content is under our control
  # (local source file), so this is acceptable here.
  return eval(cleaned, {"__builtins__": None}, {})  # type: ignore[arg-type]


# Static tables ported from CalendarController::_initialize
LUNAR_INFO: List[int] = _extract_php_array("lunarInfo")
SOLAR_MONTH: List[int] = _extract_php_array("solarMonth")
GAN: List[str] = _extract_php_array("Gan")
ZHI: List[str] = _extract_php_array("Zhi")
ANIMALS: List[str] = _extract_php_array("Animals")
SOLAR_TERM: List[str] = _extract_php_array("solarTerm")
S_TERM_INFO: List[str] = _extract_php_array("sTermInfo")

# Hour branches table from BaziController::_initialize
HOUR_BRANCHES: List[str] = [
  "子",
  "丑",
  "丑",
  "寅",
  "寅",
  "卯",
  "卯",
  "辰",
  "辰",
  "巳",
  "巳",
  "午",
  "午",
  "未",
  "未",
  "申",
  "申",
  "酉",
  "酉",
  "戌",
  "戌",
  "亥",
  "亥",
  "子",
]


def _l_year_days(y: int) -> int:
  """Return the total number of days in the lunar year y."""
  info = LUNAR_INFO[y - 1900]
  total = 348
  i = 0x8000
  while i > 0x8:
    if info & i:
      total += 1
    i >>= 1
  return total + _leap_days(y)


def _leap_month(y: int) -> int:
  """Return leap month (1-12) for year y, or 0 if no leap month."""
  return LUNAR_INFO[y - 1900] & 0xF


def _leap_days(y: int) -> int:
  """Return number of days in leap month of year y, or 0 if no leap month."""
  if _leap_month(y):
    return 30 if (LUNAR_INFO[y - 1900] & 0x10000) else 29
  return 0


def _month_days(y: int, m: int) -> int:
  """Return number of days in lunar month m of year y."""
  if m > 12 or m < 1:
    return -1
  return 30 if (LUNAR_INFO[y - 1900] & (0x10000 >> m)) else 29


def _solar_days(y: int, m: int) -> int:
  """Return number of days in Gregorian month m of year y."""
  if m > 12 or m < 1:
    return -1
  ms = m - 1
  if ms == 1:  # February
    return 29 if ((y % 4 == 0) and (y % 100 != 0) or (y % 400 == 0)) else 28
  return SOLAR_MONTH[ms]


def _to_gan_zhi_year(l_year: int) -> str:
  gan_key = (l_year - 3) % 10
  zhi_key = (l_year - 3) % 12
  if gan_key == 0:
    gan_key = 10
  if zhi_key == 0:
    zhi_key = 12
  return GAN[gan_key - 1] + ZHI[zhi_key - 1]


def _to_gan_zhi(offset: int) -> str:
  return GAN[offset % 10] + ZHI[offset % 12]


def _get_term(y: int, n: int) -> int:
  """
  Return the day of the n-th solar term in Gregorian year y.

  Port of CalendarController::getTerm.
  """
  if y < 1900 or y > 2100:
    return -1
  if n < 1 or n > 24:
    return -1

  table = S_TERM_INFO[y - 1900]
  # Split into 6 chunks of 5 hex chars and decode.
  info: List[int] = [int(table[i : i + 5], 16) for i in range(0, 30, 5)]

  calday: List[int] = []
  for value in info:
    s = f"{value:05d}"
    calday.append(int(s[0]))
    calday.append(int(s[1:3]))
    calday.append(int(s[3]))
    calday.append(int(s[4:]))
  return calday[n - 1]


def _get_animal(y: int) -> str:
  return ANIMALS[(y - 4) % 12]


def _get_diff_days(y: int, m: int, d: int) -> int:
  """
  Days offset from 1900-01-31.
  Port of CalendarController::getDiffDays.
  """
  y_days = (y - 1900) * 365 + (y - 1900) // 4
  if m > 1:
    m_days = sum(SOLAR_MONTH[: m - 1])
  else:
    m_days = 0
  if y % 4 == 0:
    y_days -= 1
    if m > 2:
      m_days += 1
  return int(y_days + m_days + d)


def _get_near_jie_qi(y: int, m: int, d: int, sort: int = 1) -> int:
  """
  Distance in days between given date and nearest Jie Qi node.
  Port of CalendarController::getNearJieQi.
  """
  next_m = m + 1 if m < 12 else 1
  next_y = y if m < 12 else y + 1
  prev_m = m - 1 if m > 1 else 12
  prev_y = y if m > 1 else y - 1

  now_node = _get_term(y, m * 2 - 1)
  next_node = _get_term(next_y, next_m * 2 - 1)
  prev_node = _get_term(prev_y, prev_m * 2 - 1)

  if sort == 1:
    if d > now_node:
      node = (next_y, next_m, next_node)
    else:
      node = (y, m, now_node)
  else:
    if d < now_node:
      node = (prev_y, prev_m, prev_node)
    else:
      node = (y, m, now_node)

  a = _get_diff_days(y, m, d)
  b = _get_diff_days(node[0], node[1], node[2])
  return abs(a - b)


def solar_to_lunar_with_ganzhi(y: int, m: int, d: int) -> Dict[str, Any]:
  """
  Port of CalendarController::solar2lunar.
  Returns a dict with lunar Y/M/D and GanZhi info.
  """
  if y < 1900 or y > 2100:
    raise ValueError("Year out of supported range 1900-2100")
  if m < 1 or m > 12:
    raise ValueError("Month out of range 1-12")
  if d < 1 or d > 31:
    raise ValueError("Day out of range 1-31")
  if y == 1900 and m == 1 and d < 31:
    raise ValueError("Date before 1900-01-31 not supported")

  offset = _get_diff_days(y, m, d)
  offset -= 31
  temp = 0
  i = 1900
  while i < 2101 and offset > 0:
    temp = _l_year_days(i)
    offset -= temp
    i += 1
  if offset < 0:
    offset += temp
    i -= 1

  lunar_year = i
  leap = _leap_month(i)
  is_leap = False

  mm = 1
  while mm < 13 and offset > 0:
    if leap > 0 and mm == (leap + 1) and not is_leap:
      mm -= 1
      is_leap = True
      temp = _leap_days(lunar_year)
    else:
      temp = _month_days(lunar_year, mm)
    if is_leap and mm == (leap + 1):
      is_leap = False
    offset -= temp
    mm += 1

  if offset == 0 and leap > 0 and mm == leap + 1:
    if is_leap:
      is_leap = False
    else:
      is_leap = True
      mm -= 1
  if offset < 0:
    offset += temp
    mm -= 1

  lunar_month = mm
  lunar_day = offset + 1

  # GanZhi for year: adjust by Li Chun
  li_chun = _get_term(y, 3)
  if m < 2 or (m == 2 and d < li_chun):
    gz_year = _to_gan_zhi_year(y - 1)
    gz_year_num = y - 1
  else:
    gz_year = _to_gan_zhi_year(lunar_year)
    gz_year_num = lunar_year

  first_node = _get_term(y, m * 2 - 1)
  second_node = _get_term(y, m * 2)

  gz_month = _to_gan_zhi((y - 1900) * 12 + m + 11)
  gz_month_num = lunar_month - 1
  if d >= first_node:
    gz_month = _to_gan_zhi((y - 1900) * 12 + m + 12)
    gz_month_num = lunar_month

  is_term = False
  term_name = None
  if first_node == d:
    is_term = True
    term_name = SOLAR_TERM[m * 2 - 2]
  if second_node == d:
    is_term = True
    term_name = SOLAR_TERM[m * 2 - 1]

  day_cyclical = _get_diff_days(y, m, d) + 9
  gz_day = _to_gan_zhi(day_cyclical)

  return {
    "lYear": lunar_year,
    "lMonth": lunar_month,
    "lDay": lunar_day,
    "Animal": _get_animal(lunar_year),
    "cYear": y,
    "cMonth": m,
    "cDay": d,
    "gzYear": gz_year,
    "gzMonth": gz_month,
    "gzDay": gz_day,
    "gzYnum": gz_year_num,
    "gzMnum": gz_month_num,
    "isLeap": is_leap,
    "isTerm": is_term,
    "Term": term_name,
  }


def get_hour_gz(hour: int, day_gan: str) -> Tuple[str, str]:
  """
  Hour pillar based on day stem, using 日上起时法.
  Port of BaziController::getHourGZ.
  """
  if hour < 0 or hour > 23:
    raise ValueError("Hour must be in 0-23")
  hour_branch = HOUR_BRANCHES[int(hour)]
  try:
    b = GAN.index(day_gan)
  except ValueError:
    # Fallback: treat as 0 index
    b = 0
  c = ZHI.index(hour_branch)
  h_tiangan = GAN[(b % 5 * 2 + c) % 10]
  return h_tiangan, hour_branch


def get_qi_yun(num_days: int, lunar_month: int) -> Tuple[int, str]:
  """
  起运算法，Port of BaziController::getQiYun.
  """
  num2 = num_days // 3
  num3 = (num_days % 3) * 4 + lunar_month
  if num3 >= 13:
    num2 += 1
    num3 -= 12
  if num2 == 0:
    num2 += 1
    text = f"{num2}岁行运"
  else:
    text = f"{num2}岁{num3}月行运"
  return num2, text


CN_MONTHS = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"]
CN_NUMS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]


def _format_lunar_day(day: int) -> str:
  if day <= 0 or day > 30:
    return str(day)
  if day <= 10:
    return f"初{CN_NUMS[day - 1]}"
  if day == 10:
    return "初十"
  if 10 < day < 20:
    return f"十{CN_NUMS[day - 11]}"
  if day == 20:
    return "二十"
  if 20 < day < 30:
    return f"廿{CN_NUMS[day - 21]}"
  return "三十"


def _format_lunar_date(gz_year: str, month: int, day: int) -> str:
  month_name = CN_MONTHS[month - 1] if 1 <= month <= 12 else f"{month}月"
  day_name = _format_lunar_day(day)
  return f"{gz_year}年 {month_name}{day_name}"


@dataclass
class BaziResultData:
  solar_time: str
  lunar_date: str
  year_pillar: str
  month_pillar: str
  day_pillar: str
  hour_pillar: str
  start_age: int
  direction: str
  da_yun: List[str]


def calculate_bazi_from_basic_profile(user_input: Dict[str, Any]) -> Dict[str, Any]:
  """
  Deterministic BaZi calculation based on the legacy PHP implementation
  in backend/bazi-master.

  Input schema matches backend.schemas.BaziUserInput.
  Returns a dict compatible with backend.schemas.BaziResult.
  """
  birth_date = user_input.get("birthDate")
  birth_time = user_input.get("birthTime")
  birth_location = user_input.get("birthLocation")
  gender = user_input.get("gender") or "Male"

  if not birth_date or not birth_time or not birth_location:
    raise ValueError("birthDate, birthTime and birthLocation are required for BaZi calculation")

  try:
    year_str, month_str, day_str = birth_date.split("-")
    y = int(year_str)
    m = int(month_str)
    d = int(day_str)
  except Exception as exc:  # noqa: BLE001
    raise ValueError(f"Invalid birthDate format: {birth_date}") from exc

  try:
    hour_str, _minute_str = birth_time.split(":", 1)
    hour = int(hour_str)
  except Exception as exc:  # noqa: BLE001
    raise ValueError(f"Invalid birthTime format: {birth_time}") from exc

  sex = 0 if gender == "Male" else 1

  cal = solar_to_lunar_with_ganzhi(y, m, d)
  birthday_year = cal["lYear"]
  birthday_month = cal["lMonth"]

  year_gz = str(cal["gzYear"])
  month_gz = str(cal["gzMonth"])
  day_gz = str(cal["gzDay"])

  # 阳男阴女顺行，阴男阳女逆行
  sort = 2 if ((birthday_year % 2 + sex) == 1) else 1
  direction = "Forward" if sort == 1 else "Backward"

  # Days distance to nearest Jie Qi and starting age of DaYun
  jieqi_days = _get_near_jie_qi(y, m, d, sort)
  start_age, _start_age_text = get_qi_yun(jieqi_days, birthday_month)

  # Build 60 GanZhi cycle
  jz_cycle = [GAN[i % 10] + ZHI[i % 12] for i in range(60)]

  # Month pillar index in 60 JiaZi
  try:
    month_index = jz_cycle.index(month_gz)
  except ValueError:
    month_index = 0

  da_yun: List[str] = []
  for i in range(8):
    if sort == 2:
      offset = (month_index - i - 1 + 60) % 60
    else:
      offset = (month_index + i + 1) % 60
    da_yun.append(jz_cycle[offset])

  day_gan = day_gz[0]
  hour_gan, hour_zhi = get_hour_gz(hour, day_gan)

  lunar_date_str = _format_lunar_date(year_gz, birthday_month, cal["lDay"])

  result: Dict[str, Any] = {
    "userInput": user_input,
    "solarTime": birth_time,
    "lunarDate": lunar_date_str,
    "bazi": {
      "year": {"gan": year_gz[0], "zhi": year_gz[1]},
      "month": {"gan": month_gz[0], "zhi": month_gz[1]},
      "day": {"gan": day_gan, "zhi": day_gz[1]},
      "hour": {"gan": hour_gan, "zhi": hour_zhi},
    },
    "startAge": start_age,
    "direction": direction,
    "daYun": da_yun,
  }
  return result

