import json
import os
from typing import Tuple, Dict, Any

from openai import OpenAI

from .config import get_settings
from .constants import BAZI_SYSTEM_INSTRUCTION

settings = get_settings()

try:
  # 用于精确的公历 -> 农历转换，避免完全依赖大模型。
  from chinese_lunar_calendar_converter import solar_to_lunar  # type: ignore[import]
except Exception as exc:  # noqa: BLE001
  print(f"[BaZi] chinese_lunar_calendar_converter not available: {exc}")
  solar_to_lunar = None  # type: ignore[assignment]


YANG_STEMS = ["甲", "丙", "戊", "庚", "壬"]
YIN_STEMS = ["乙", "丁", "己", "辛", "癸"]


def get_stem_polarity(pillar: str) -> str:
  """
  Determine Tian Gan polarity for the given pillar.

  Returns "YANG" or "YIN".
  """
  if not pillar:
    return "YANG"
  ch = pillar.strip()[0]
  if ch in YANG_STEMS:
    return "YANG"
  if ch in YIN_STEMS:
    return "YIN"
  return "YANG"


def build_prompts(input_data: dict) -> Tuple[str, str]:
  """
  Build system and user prompts for the life analysis task.

  input_data is expected to come from AnalysisInput.model_dump().
  """
  gender = input_data.get("gender") or "Male"
  gender_str = "男 (乾造)" if gender == "Male" else "女 (坤造)"

  year_pillar = input_data.get("year_pillar") or ""
  month_pillar = input_data.get("month_pillar") or ""
  day_pillar = input_data.get("day_pillar") or ""
  hour_pillar = input_data.get("hour_pillar") or ""

  start_age = int(input_data.get("start_age") or 1)
  first_da_yun = input_data.get("first_da_yun") or ""
  birth_year = input_data.get("birth_year") or ""
  name = input_data.get("name") or "未提供"

  year_polarity = get_stem_polarity(year_pillar)

  is_forward = False
  if gender == "Male":
    is_forward = year_polarity == "YANG"
  else:
    is_forward = year_polarity == "YIN"

  da_yun_direction_str = "顺行 (Forward)" if is_forward else "逆行 (Backward)"
  direction_example = (
    "例如：第一步是【戊申】，第二步则是【己酉】（顺排）"
    if is_forward
    else "例如：第一步是【戊申】，第二步则是【丁未】（逆排）"
  )

  user_prompt = f"""
请根据以下**已经排好的**八字四柱和**指定的大运信息**进行分析。

【基本信息】
性别：{gender_str}
姓名：{name}
出生年份：{birth_year}年 (阳历)

【八字四柱】
年柱：{year_pillar} (天干属性：{"阳" if year_polarity == "YANG" else "阴"})
月柱：{month_pillar}
日柱：{day_pillar}
时柱：{hour_pillar}

【大运核心参数】
1. 起运年龄：{start_age} 岁 (虚岁)。
2. 第一步大运：{first_da_yun}。
3. **排序方向**：{da_yun_direction_str}。

【必须执行的算法 - 大运序列生成】
请严格按照以下步骤生成数据：

1. **锁定第一步**：确认【{first_da_yun}】为第一步大运。
2. **计算序列**：根据六十甲子顺序和方向（{da_yun_direction_str}），推算出接下来的 9 步大运。
   {direction_example}
3. **填充 JSON**：
   - Age 1 到 {start_age - 1}: daYun = "童限"
   - Age {start_age} 到 {start_age + 9}: daYun = [第1步大运: {first_da_yun}]
   - Age {start_age + 10} 到 {start_age + 19}: daYun = [第2步大运]
   - Age {start_age + 20} 到 {start_age + 29}: daYun = [第3步大运]
   - ...以此类推直到 100 岁。

【特别警告】
- **daYun 字段**：必须填大运干支（10年一变），**绝对不要**填流年干支。
- **ganZhi 字段**：填入该年份的**流年干支**（每年一变，例如 2024=甲辰，2025=乙巳）。

任务：
1. 确认格局与喜忌。
2. 生成 **1-100 岁 (虚岁)** 的人生流年K线数据。
3. 在 `reason` 字段中提供流年详批。
4. 生成带评分的命理分析报告（包含性格分析、星座运势分析、发展风水分析）。

请严格按照系统指令生成 JSON 数据。
""".strip()

  system_prompt = (
    BAZI_SYSTEM_INSTRUCTION
    + "\n\n请务必只返回纯JSON格式数据，不要包含任何markdown代码块标记。"
  )
  return system_prompt, user_prompt


def calculate_bazi_from_basic_info(user_input: Dict[str, Any]) -> Dict[str, Any]:
  """
  Use the LLM to calculate BaZi chart and Da Yun information based on
  basic profile input (birth date, time, location, gender).

  The expected structure of user_input is aligned with BaziUserInput in
  backend.schemas:
    - name (optional)
    - gender: "Male" | "Female"
    - birthDate: "YYYY-MM-DD"
    - birthTime: "HH:MM"
    - birthLocation: free-text location string

  Returns a dict matching backend.schemas.BaziResult (but as plain dict).
  """
  birth_date = user_input.get("birthDate")
  birth_time = user_input.get("birthTime")
  birth_location = user_input.get("birthLocation")
  gender = user_input.get("gender") or "Male"

  if not birth_date or not birth_time or not birth_location:
    raise ValueError("birthDate, birthTime and birthLocation are required for BaZi calculation")

  system_prompt = (
    "You are an expert in Traditional Chinese BaZi (Four Pillars). "
    "You will calculate the BaZi chart and Da Yun based on the user's "
    "birth information. "
    "Return ONLY valid JSON, without any markdown code fences or extra text."
  )

  schema_hint = """
Return ONLY valid JSON matching this exact schema (no markdown, no code blocks):
{
  "solarTime": "string - Calculated True Solar Time in HH:mm format",
  "lunarDate": "string - Lunar Date representation (e.g., '1990年腊月初五')",
  "bazi": {
    "year": { "gan": "string", "zhi": "string" },
    "month": { "gan": "string", "zhi": "string" },
    "day": { "gan": "string", "zhi": "string" },
    "hour": { "gan": "string", "zhi": "string" }
  },
  "startAge": "integer - The age when the first Big Luck cycle starts",
  "direction": "string - Forward or Backward based on Gender and Year Stem",
  "daYun": ["array of strings - List of the first 8-10 Big Luck Pillars (GanZhi) e.g. ['甲子', '乙丑']"]
}
""".strip()

  user_prompt = f"""
Calculate the BaZi chart for:
Date: {birth_date}
Clock Time: {birth_time}
Location: {birth_location} (Use this to calculate True Solar Time deviation from UTC/Standard time)
Gender: {gender}

1. Calculate True Solar Time (真太阳时).
2. Convert the date to Chinese Lunar Date (农历).
3. Arrange the Year, Month, Day, and Hour pillars accurately based on Solar Time.
4. Calculate the Start Age (起运岁数) and Direction (Forward/Backward).
5. List the first 10 Big Luck (Da Yun) pillars.

{schema_hint}
""".strip()

  # Lightweight demo mode: when api_key is set to "demo", skip real HTTP calls
  # and return a small but structurally valid payload so that the front-end can
  # exercise the flow without hitting the real LLM.
  if settings.llm_api_key == "demo":
    demo = {
      "solarTime": "06:00",
      "lunarDate": "一九九零年正月初一",
      "bazi": {
        "year": {"gan": "庚", "zhi": "午"},
        "month": {"gan": "甲", "zhi": "子"},
        "day": {"gan": "丙", "zhi": "辰"},
        "hour": {"gan": "壬", "zhi": "寅"},
      },
      "startAge": 8,
      "direction": "Forward",
      "daYun": ["丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未"],
    }
    return demo
  content = call_llm(system_prompt, user_prompt)
  data = extract_json_from_content(content)

  # 使用本地算法覆写 lunarDate，保证农历年月日准确。
  if solar_to_lunar is not None:
    try:
      lunar_info = solar_to_lunar(birth_date)
      # lunar_info 示例: (甲辰年, 丁丑月, 戊戌日, 正月, 初一)
      lunar_year_gz, _lunar_month_gz, _lunar_day_gz, lunar_month, lunar_day = lunar_info
      data["lunarDate"] = f"{lunar_year_gz} {lunar_month}{lunar_day}"
    except Exception as exc:  # noqa: BLE001
      # 本地转换失败时不阻断流程，保留大模型原始结果。
      print(f"[BaZi] local lunar conversion failed for {birth_date}: {exc}")

  return data


def call_llm(system_prompt: str, user_prompt: str) -> str:
  """
  Call the configured Doubao/Ark chat completions API (OpenAI-compatible)
  and return the assistant content text.

  The returned content is expected (but not guaranteed) to be a JSON string.
  """
  api_key = getattr(settings, "llm_api_key", None) or os.getenv("ARK_API_KEY")
  api_base = getattr(settings, "llm_api_base", None) or "https://ark.cn-beijing.volces.com/api/v3"
  model = getattr(settings, "llm_model", None) or "doubao-seed-1-6-251015"

  # Lightweight demo mode: when api_key is set to "demo", skip real HTTP calls
  # and return a small but structurally valid JSON payload.
  if api_key == "demo":
    chart_points = []
    start_year = 2000
    for age in range(1, 101):
      year = start_year + age - 1
      base = 50
      # Create some up/down waves to mimic bull/bear cycles
      wave = ((age % 10) - 5) * 3
      score = max(10, min(90, base + wave * 2))
      point = {
        "age": age,
        "year": year,
        "daYun": "童限" if age < 10 else "示例大运",
        "ganZhi": "示例干支",
        "open": score - 3,
        "close": score + 3,
        "high": score + 6,
        "low": score - 6,
        "score": score,
        "reason": "示例流年分析，供本地调试使用"
      }
      chart_points.append(point)

    demo_payload = {
      "bazi": ["癸未", "壬戌", "丙子", "庚寅"],
      "summary": "这是本地 demo 模式下生成的示例总评，用于验证前后端联通与渲染流程。",
      "summaryScore": 7,
      "personality": "性格沉稳理性，擅长在波动市场中寻找结构性机会。",
      "personalityScore": 8,
      "industry": "适合长期主义与复利思维主导的行业，如科技与基础设施。",
      "industryScore": 7,
      "fengShui": "宜多接触山海之气，办公与居住保持采光通风，远离杂乱与噪音。",
      "fengShuiScore": 8,
      "wealth": "财富呈阶梯式上升，中年后机会明显增多，注意分散风险。",
      "wealthScore": 8,
      "marriage": "情感务实重稳，宜多沟通表达内心需求，避免因忙碌忽略陪伴。",
      "marriageScore": 7,
      "health": "总体健康良好，注意作息规律与运动，坚持体检排查潜在问题。",
      "healthScore": 7,
      "family": "与家人关系温和稳定，关键年份需多承担责任与支持。",
      "familyScore": 7,
      "crypto": "币圈运势偏稳健，适合中长期布局主流资产，把握周期轮动。",
      "cryptoScore": 7,
      "cryptoYear": "2032年 (示例暴富流年)",
      "cryptoStyle": "现货定投",
      "chartPoints": chart_points,
    }
    return json.dumps(demo_payload, ensure_ascii=False)

  if not api_key:
    raise RuntimeError(
      "LLM API key is not configured (APP_LLM_API_KEY or ARK_API_KEY)."
    )

  client = OpenAI(
    api_key=api_key,
    base_url=api_base,
  )

  # Doubao / 其他 OpenAI 兼容服务：优先尝试 response_format=json_object，
  # 如果后端不支持该参数（部分第三方实现会报错），则自动降级为普通文本响应。
  common_kwargs = {
    "model": model,
    "messages": [
      {"role": "system", "content": system_prompt},
      {"role": "user", "content": user_prompt},
    ],
    "temperature": 0.7,
    "max_tokens": getattr(settings, "llm_max_tokens", 8192),
  }

  try:
    completion = client.chat.completions.create(
      **common_kwargs,
      response_format={"type": "json_object"},
    )
  except Exception as exc:  # noqa: BLE001
    message = str(exc)
    # 仅当错误看起来与 response_format / JSON 相关时才做兜底重试，
    # 其他错误直接抛出，避免吞掉真实问题。
    if "response_format" in message or "json_object" in message:
      completion = client.chat.completions.create(**common_kwargs)
    else:
      raise

  message = completion.choices[0].message
  content = message.content

  # openai>=1.* 可能返回 str 或 content-part 列表，这里统一成 str
  if isinstance(content, list):
    # 拼接所有 text 段
    parts = []
    for part in content:
      # part 可能是 ChatCompletionMessageContentPartText 等对象
      text = getattr(part, "text", None)
      if isinstance(text, str):
        parts.append(text)
    content_str = "".join(parts)
  else:
    content_str = content

  if not isinstance(content_str, str):
    raise RuntimeError("LLM response content is not a string.")

  return content_str


def extract_json_from_content(content: str) -> dict:
  """
  Try to parse JSON from the LLM content string.

  1. Direct json.loads
  2. Fallback: extract substring between first '{' and last '}'.
  """
  try:
    return json.loads(content)
  except json.JSONDecodeError:
    pass

  start = content.find("{")
  end = content.rfind("}")
  if start == -1 or end == -1 or end <= start:
    raise ValueError("LLM content does not contain JSON object.")

  snippet = content[start : end + 1]
  return json.loads(snippet)
