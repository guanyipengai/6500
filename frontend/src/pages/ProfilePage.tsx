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
    todayRemaining: number;
    myReferralUrl: string;
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
          todayRemaining: me.todayRemaining,
          myReferralUrl: me.myReferralUrl
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
    <div style={{ minHeight: "100vh", padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>填写命盘信息</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label>
          姓名（可选）
          <input
            type="text"
            value={form.name || ""}
            onChange={e => handleChange("name", e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
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
        <label>
          出生年份（阳历）
          <input
            type="number"
            value={form.birth_year}
            onChange={e => handleChange("birth_year", Number(e.target.value))}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          年柱
          <input
            type="text"
            value={form.year_pillar}
            onChange={e => handleChange("year_pillar", e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          月柱
          <input
            type="text"
            value={form.month_pillar}
            onChange={e => handleChange("month_pillar", e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          日柱
          <input
            type="text"
            value={form.day_pillar}
            onChange={e => handleChange("day_pillar", e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          时柱
          <input
            type="text"
            value={form.hour_pillar}
            onChange={e => handleChange("hour_pillar", e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          起运年龄（虚岁）
          <input
            type="number"
            value={form.start_age}
            onChange={e => handleChange("start_age", Number(e.target.value))}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          第一步大运
          <input
            type="text"
            value={form.first_da_yun}
            onChange={e => handleChange("first_da_yun", e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        {error && (
          <div style={{ color: "red", fontSize: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} style={{ padding: 10, marginTop: 8 }}>
          {submitting ? "创建分析任务中..." : "生成人生K线"}
        </button>
      </form>

      <hr style={{ margin: "24px 0" }} />

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>邀请好友，获得更多测算次数</h2>
        {loadingUser && <p>加载中...</p>}
        {inviteInfo && (
          <>
            <p style={{ marginBottom: 4 }}>今日剩余次数：{inviteInfo.todayRemaining}</p>
            <p style={{ marginBottom: 4, wordBreak: "break-all" }}>
              我的专属链接：{inviteInfo.myReferralUrl}
            </p>
          </>
        )}
      </section>
    </div>
  );
};

