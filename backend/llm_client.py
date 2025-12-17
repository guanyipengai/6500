import json
from typing import Tuple

import httpx

from .config import get_settings
from .constants import BAZI_SYSTEM_INSTRUCTION


settings = get_settings()


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
4. 生成带评分的命理分析报告（包含性格分析、币圈交易分析、发展风水分析）。

请严格按照系统指令生成 JSON 数据。
""".strip()

  system_prompt = (
    BAZI_SYSTEM_INSTRUCTION
    + "\n\n请务必只返回纯JSON格式数据，不要包含任何markdown代码块标记。"
  )
  return system_prompt, user_prompt


def call_llm(system_prompt: str, user_prompt: str) -> str:
  """
  Call the SiliconFlow chat completions API and return the assistant content text.

  The returned content is expected (but not guaranteed) to be a JSON string.
  """
  api_key = getattr(settings, "llm_api_key", None)
  api_base = getattr(settings, "llm_api_base", None) or "https://api.siliconflow.cn/v1/chat/completions"
  model = getattr(settings, "llm_model", None) or "Qwen/Qwen3-30B-A3B-Instruct-2507"

  if not api_key:
    raise RuntimeError("LLM API key is not configured (APP_LLM_API_KEY).")

  payload = {
    "model": model,
    "messages": [
      {"role": "system", "content": system_prompt},
      {"role": "user", "content": user_prompt},
    ],
    "stream": False,
    "max_tokens": 8192,
    "temperature": 0.7,
    "top_p": 0.7,
    "top_k": 50,
    "frequency_penalty": 0.5,
    "n": 1,
    "response_format": {"type": "text"},
  }

  headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
  }

  with httpx.Client(timeout=60) as client:
    resp = client.post(api_base, headers=headers, json=payload)
    resp.raise_for_status()
    data = resp.json()

  choices = data.get("choices") or []
  if not choices:
    raise RuntimeError("LLM response missing choices.")

  message = choices[0].get("message") or {}
  content = message.get("content")
  if not isinstance(content, str):
    raise RuntimeError("LLM response content is not a string.")

  return content


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

