import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAnalysis, getMe } from "../api";
import { useAuthToken } from "../hooks";
import type { AnalysisInput } from "../types";
import logo from "../assets/logo.svg";

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
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <header
        style={{
          background: "#ffffff",
          padding: "16px 0",
          borderBottom: "1px solid #e5e7eb"
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={logo}
              alt="人生牛市 Logo"
              style={{
                width: 40,
                height: 40,
                borderRadius: 8
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 18,
                  lineHeight: "24px",
                  color: "#111827"
                }}
              >
                人生牛市
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: "16px",
                  color: "#6b7280"
                }}
              >
                Life&apos;s bull market
              </div>
            </div>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          padding: "24px 16px 32px",
          maxWidth: 640,
          margin: "0 auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 24
        }}
      >
        {/* 顶部品牌 + 标语，贴合 input 页设计 */}
        <section style={{ textAlign: "center" }}>
          <div
            style={{
              marginBottom: 8,
              color: "#ff3164",
              fontSize: 28,
              lineHeight: "34px"
            }}
          >
            洞见人生牛市
          </div>
          <div
            style={{
              marginBottom: 8,
              color: "#111827",
              fontSize: 20,
              lineHeight: "26px"
            }}
          >
            命运有其波动
          </div>
          <p
            style={{
              color: "#4b5563",
              fontSize: 14,
              lineHeight: "20px"
            }}
          >
            以易经观变，以数据成形，让百年人生显现为一条折线。
            <br />
            看见起伏 · 理解节奏 · 把握转折。
          </p>
        </section>

        {/* 八字排盘表单卡片 */}
        <section>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              border: "1px solid #f3f4f6",
              padding: 24,
              boxShadow:
                "0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h1
                style={{
                  fontSize: 22,
                  marginBottom: 4,
                  color: "#1f2937"
                }}
              >
                八字排盘
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280"
                }}
              >
                填写出生信息，AI 自动排盘并分析
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                  姓名（可选）
                  <input
                    type="text"
                    value={form.name || ""}
                    onChange={e => handleChange("name", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      marginTop: 4,
                      borderRadius: 8,
                      border: "1px solid #d1d5db"
                    }}
                  />
                </label>
                <label style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                  性别
                  <select
                    value={form.gender}
                    onChange={e => handleChange("gender", e.target.value as "Male" | "Female")}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      marginTop: 4,
                      borderRadius: 8,
                      border: "1px solid #d1d5db"
                    }}
                  >
                    <option value="Male">乾造 (男)</option>
                    <option value="Female">坤造 (女)</option>
                  </select>
                </label>
              </div>

              <label style={{ fontSize: 14, color: "#374151" }}>
                出生年份（阳历）
                <input
                  type="number"
                  value={form.birth_year}
                  onChange={e => handleChange("birth_year", Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    marginTop: 4,
                    borderRadius: 8,
                    border: "1px solid #d1d5db"
                  }}
                />
              </label>

              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                  年柱
                  <input
                    type="text"
                    value={form.year_pillar}
                    onChange={e => handleChange("year_pillar", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      marginTop: 4,
                      borderRadius: 8,
                      border: "1px solid #d1d5db"
                    }}
                  />
                </label>
                <label style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                  月柱
                  <input
                    type="text"
                    value={form.month_pillar}
                    onChange={e => handleChange("month_pillar", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      marginTop: 4,
                      borderRadius: 8,
                      border: "1px solid #d1d5db"
                    }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                  日柱
                  <input
                    type="text"
                    value={form.day_pillar}
                    onChange={e => handleChange("day_pillar", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      marginTop: 4,
                      borderRadius: 8,
                      border: "1px solid #d1d5db"
                    }}
                  />
                </label>
                <label style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                  时柱
                  <input
                    type="text"
                    value={form.hour_pillar}
                    onChange={e => handleChange("hour_pillar", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      marginTop: 4,
                      borderRadius: 8,
                      border: "1px solid #d1d5db"
                    }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                  起运年龄（虚岁）
                  <input
                    type="number"
                    value={form.start_age}
                    onChange={e => handleChange("start_age", Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      marginTop: 4,
                      borderRadius: 8,
                      border: "1px solid #d1d5db"
                    }}
                  />
                </label>
                <label style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                  第一步大运
                  <input
                    type="text"
                    value={form.first_da_yun}
                    onChange={e => handleChange("first_da_yun", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      marginTop: 4,
                      borderRadius: 8,
                      border: "1px solid #d1d5db"
                    }}
                  />
                </label>
              </div>

              {error && (
                <div style={{ color: "red", fontSize: 12 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 8,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  color: "#ffffff",
                  fontSize: 16,
                  cursor: submitting ? "default" : "pointer",
                  background:
                    "linear-gradient(93.33deg, rgba(254,9,70,1) 4%, rgba(184,13,24,1) 52%, rgba(45,45,45,1) 100%)",
                  boxShadow:
                    "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)"
                }}
              >
                {submitting ? "创建分析任务中..." : "打开我的人生牛市"}
              </button>
            </form>

            <div
              style={{
                marginTop: 16,
                background: "#eff6ff",
                borderRadius: 8,
                border: "1px solid #dbeafe",
                padding: 12,
                fontSize: 12,
                color: "#1e40af"
              }}
            >
              <span style={{ fontWeight: 500 }}>提示：</span>
              AI 会根据您的出生信息自动进行八字排盘（查万年历、推导大运），然后生成 100 年人生 K 线图。
            </div>
          </div>
        </section>

        {/* 邀请区块，贴合 input 页底部设计 */}
        <section>
          <h2
            style={{
              fontSize: 18,
              marginBottom: 8,
              color: "#1f2937"
            }}
          >
            邀请好友，获得更多测算次数
          </h2>
          {loadingUser && <p>加载中...</p>}
          {inviteInfo && (
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(250,245,255,1) 0%, rgba(253,242,248,1) 100%)",
                borderRadius: 12,
                border: "1px solid #e9d5ff",
                padding: 16,
                boxShadow: "0px 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <p style={{ marginBottom: 4, fontSize: 14, color: "#1f2937" }}>
                每邀请 5 位完成测算，可额外解锁 +1 次测算机会，每天最多 +10 次。
              </p>
              <p style={{ marginBottom: 4, fontSize: 13, color: "#4b5563" }}>
                今日剩余：{inviteInfo.todayRemaining} 次（基础 {inviteInfo.todayBaseQuota} 次 / 推广{" "}
                {inviteInfo.todayExtraQuota} 次）
              </p>
              <p style={{ marginBottom: 4, fontSize: 13, color: "#4b5563" }}>
                累计推荐：{inviteInfo.totalInvited} 人，今日获得：{inviteInfo.invitedToday} 人
              </p>
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e9d5ff",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "#6b7280",
                    wordBreak: "break-all"
                  }}
                >
                  {inviteInfo.myReferralUrl}
                </div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#ff6c96"
                }}
              >
                建议分享给志同道合的朋友，一起开启人生牛市。
              </div>
            </div>
          )}
        </section>
      </main>

      <footer
        style={{
          padding: 16,
          fontSize: 11,
          color: "#9ca3af",
          textAlign: "center",
          background: "#111827"
        }}
      >
        © 2025 人生牛市 | 仅供娱乐，请勿迷信
      </footer>
    </div>
  );
};
