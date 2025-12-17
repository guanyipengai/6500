import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAnalysis, getMe } from "../api";
import { useAuthToken } from "../hooks";
import type { AnalysisInput } from "../types";

export const ProfilePage: React.FC = () => {
  const { token } = useAuthToken();
  const navigate = useNavigate();

  const [form, setForm] = useState<AnalysisInput>({
    name: "",
    gender: "Male",
    birth_year: new Date().getFullYear(),
    year_pillar: "",
    month_pillar: "",
    day_pillar: "",
    hour_pillar: "",
    start_age: 8,
    first_da_yun: ""
  });

  const [inviteInfo, setInviteInfo] = useState<{
    todayBaseQuota: number;
    todayExtraQuota: number;
    todayRemaining: number;
    myReferralUrl: string;
    totalInvited: number;
    invitedToday: number;
  } | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }
    const fetchMe = async () => {
      try {
        setLoadingUser(true);
        const me = await getMe(token);
        setInviteInfo({
          todayBaseQuota: me.todayBaseQuota,
          todayExtraQuota: me.todayExtraQuota,
          todayRemaining: me.todayRemaining,
          myReferralUrl: me.myReferralUrl,
          totalInvited: me.totalInvited,
          invitedToday: me.invitedToday
        });
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchMe();
  }, [token, navigate]);

  const handleChange = (key: keyof AnalysisInput, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      setSubmitting(true);
      const created = await createAnalysis(token, form);
      navigate(`/bazi/${created.id}`);
    } catch (e: any) {
      setError(e.message || "创建分析任务失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: 16, maxWidth: 600, margin: "0 auto" }}>
      {/* 顶部品牌 + 标语，参考 input 页设计 */}
      <section style={{ marginBottom: 24, textAlign: "center" }}>
        <h2 style={{ fontSize: 26, marginBottom: 8 }}>洞见人生牛市</h2>
        <p style={{ fontSize: 16, color: "#555", marginBottom: 8 }}>命运有其波动</p>
        <p style={{ fontSize: 13, color: "#777", lineHeight: 1.5 }}>
          以易经观变，以数据成形，让百年人生显现为一条折线。
          <br />
          看见起伏 · 理解节奏 · 把握转折。
        </p>
      </section>

      {/* 八字排盘表单 */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>八字排盘</h1>
          <p style={{ fontSize: 13, color: "#666" }}>填写出生信息，AI 自动排盘并分析</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              姓名（可选）
              <input
                type="text"
                value={form.name || ""}
                onChange={e => handleChange("name", e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
            <label style={{ flex: 1 }}>
              性别
              <select
                value={form.gender}
                onChange={e => handleChange("gender", e.target.value as "Male" | "Female")}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              >
                <option value="Male">乾造 (男)</option>
                <option value="Female">坤造 (女)</option>
              </select>
            </label>
          </div>

          <label>
            出生年份（阳历）
            <input
              type="number"
              value={form.birth_year}
              onChange={e => handleChange("birth_year", Number(e.target.value))}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              年柱
              <input
                type="text"
                value={form.year_pillar}
                onChange={e => handleChange("year_pillar", e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
            <label style={{ flex: 1 }}>
              月柱
              <input
                type="text"
                value={form.month_pillar}
                onChange={e => handleChange("month_pillar", e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              日柱
              <input
                type="text"
                value={form.day_pillar}
                onChange={e => handleChange("day_pillar", e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
            <label style={{ flex: 1 }}>
              时柱
              <input
                type="text"
                value={form.hour_pillar}
                onChange={e => handleChange("hour_pillar", e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              起运年龄（虚岁）
              <input
                type="number"
                value={form.start_age}
                onChange={e => handleChange("start_age", Number(e.target.value))}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
            <label style={{ flex: 1 }}>
              第一步大运
              <input
                type="text"
                value={form.first_da_yun}
                onChange={e => handleChange("first_da_yun", e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
          </div>

          {error && (
            <div style={{ color: "red", fontSize: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} style={{ padding: 10, marginTop: 8 }}>
            {submitting ? "创建分析任务中..." : "打开我的人生牛市"}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
          提示：AI 会根据您的出生信息自动进行八字排盘（查万年历、推导大运），然后生成 100 年人生 K
          线图。
        </div>
      </section>

      {/* 邀请区块，参考 input 页底部设计 */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>邀请好友，获得更多次数</h2>
        {loadingUser && <p>加载中...</p>}
        {inviteInfo && (
          <div
            style={{
              borderRadius: 12,
              padding: 12,
              border: "1px solid #eee",
              background: "#faf5ff"
            }}
          >
            <p style={{ marginBottom: 4 }}>
              今日剩余次数：{inviteInfo.todayRemaining}
            </p>
            <p style={{ marginBottom: 4 }}>
              基础 {inviteInfo.todayBaseQuota} 次
              {" / "}
              推广 {inviteInfo.todayExtraQuota} 次
            </p>
            <p style={{ marginBottom: 4 }}>
              累计推荐：{inviteInfo.totalInvited} 人，今日获得：{inviteInfo.invitedToday} 人
            </p>
            <p style={{ marginBottom: 4, fontSize: 12, color: "#555" }}>
              规则：分享链接给朋友，每有 1 人完成测算，你就获得 +1 次机会。每天最多获得 10 次。
            </p>
            <p style={{ marginBottom: 4, wordBreak: "break-all", fontSize: 12 }}>
              我的专属推广链接：{inviteInfo.myReferralUrl}
            </p>
          </div>
        )}
      </section>

      <footer style={{ fontSize: 11, color: "#999", textAlign: "center", paddingBottom: 16 }}>
        © 2025 人生牛市 | 仅供娱乐，请勿迷信
      </footer>
    </div>
  );
};

