export interface AnalysisInput {
  name?: string;
  gender: "Male" | "Female";
  birth_year: number;
  year_pillar: string;
  month_pillar: string;
  day_pillar: string;
  hour_pillar: string;
  start_age: number;
  first_da_yun: string;
  // Optional original birth info, kept for history/prefill.
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
}

// 原始出生信息（对齐 reference/lifeline-k--main 的 InputForm）
export interface BasicProfileInput {
  name?: string;
  gender: "Male" | "Female";
  birthDate: string;      // YYYY-MM-DD
  birthTime: string;      // HH:mm
  birthLocation: string;  // free-text city / place
}

export interface BaziPillar {
  gan: string;
  zhi: string;
  element?: string;
}

export interface BaziChart {
  year: BaziPillar;
  month: BaziPillar;
  day: BaziPillar;
  hour: BaziPillar;
}

export interface BaziResult {
  userInput: BasicProfileInput;
  solarTime: string;
  lunarDate: string;
  bazi: BaziChart;
  startAge: number;
  direction: string; // "Forward" | "Backward"
  daYun: string[];
}

export interface KLinePoint {
  age: number;
  year: number;
  ganZhi: string;
  daYun?: string;
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
  reason: string;
}

export interface AnalysisData {
  bazi: string[];
  summary: string;
  summaryScore: number;
  personality: string;
  personalityScore: number;
  industry: string;
  industryScore: number;
  fengShui: string;
  fengShuiScore: number;
  wealth: string;
  wealthScore: number;
  marriage: string;
  marriageScore: number;
  health: string;
  healthScore: number;
  family: string;
  familyScore: number;
  crypto: string;
  cryptoScore: number;
  cryptoYear: string;
  cryptoStyle: string;
}

export interface LifeDestinyResult {
  chartData: KLinePoint[];
  analysis: AnalysisData;
}
