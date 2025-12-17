import type { AnalysisInput } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function sendCode(phone: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/auth/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
  if (!resp.ok) {
    throw new Error("发送验证码失败");
  }
}

export async function verifyCode(phone: string, code: string, inviterCode?: string): Promise<TokenResponse> {
  const resp = await fetch(`${API_BASE}/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code, inviterCode: inviterCode || null })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "验证码验证失败");
  }
  return resp.json();
}

export interface UserMeResponse {
  user: {
    id: number;
    phone: string;
    referral_code: string;
    inviter_code?: string | null;
  };
  todayBaseQuota: number;
  todayExtraQuota: number;
  todayUsed: number;
  todayRemaining: number;
  totalInvited: number;
  invitedToday: number;
  myReferralUrl: string;
}

export async function getMe(token: string): Promise<UserMeResponse> {
  const resp = await fetch(`${API_BASE}/user/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) {
    throw new Error("获取用户信息失败");
  }
  return resp.json();
}

export interface AnalysisCreateResponse {
  id: number;
  status: string;
}

export async function createAnalysis(token: string, input: AnalysisInput): Promise<AnalysisCreateResponse> {
  const resp = await fetch(`${API_BASE}/analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "创建分析任务失败");
  }
  return resp.json();
}

export interface AnalysisDetail {
  id: number;
  status: string;
  input: AnalysisInput;
  output?: any;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export async function getAnalysis(token: string, id: number): Promise<AnalysisDetail> {
  const resp = await fetch(`${API_BASE}/analysis/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "获取分析任务失败");
  }
  return resp.json();
}

