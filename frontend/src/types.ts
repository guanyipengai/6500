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
