import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { calculateBazi, createAnalysis, getMe, getLatestAnalysis } from "../api";
import { useAuthToken } from "../hooks";
import type { AnalysisInput, BasicProfileInput, BaziResult } from "../types";
import logo from "../assets/logo.svg";
import copyIcon from "../assets/copy-alt.svg";
import menuIcon from "../assets/menu.svg";

export const ProfilePage: React.FC = () => {
  const { token, setToken } = useAuthToken();
  const navigate = useNavigate();

  const [form, setForm] = useState<BasicProfileInput>({
    name: "",
    gender: "Male",
    birthDate: "1990-01-01",
    birthTime: "06:00",
    birthLocation: ""
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
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("未知用户");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }
    const fetchInitial = async () => {
      setLoadingUser(true);
      try {
        const me = await getMe(token);
        setInviteInfo({
          todayBaseQuota: me.todayBaseQuota,
          todayExtraQuota: me.todayExtraQuota,
          todayRemaining: me.todayRemaining,
          myReferralUrl: me.myReferralUrl,
          totalInvited: me.totalInvited,
          invitedToday: me.invitedToday
        });
        try {
          const latest = await getLatestAnalysis(token);
          if (latest && latest.input) {
            setForm(prev => ({
              ...prev,
              name: latest.input.name || prev.name,
              gender: latest.input.gender || prev.gender,
              birthDate:
                latest.input.birthDate ||
                prev.birthDate ||
                (latest.input.birth_year ? `${latest.input.birth_year}-01-01` : prev.birthDate),
              birthTime: latest.input.birthTime || prev.birthTime,
              birthLocation: latest.input.birthLocation || prev.birthLocation
            }));
          }
        } catch (err) {
          console.error("getLatestAnalysis failed", err);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchInitial();
  }, [token, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("life_bull_display_name");
    if (stored && stored.trim()) {
      setDisplayName(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (form.name && form.name.trim()) {
      window.localStorage.setItem("life_bull_display_name", form.name.trim());
      setDisplayName(form.name.trim());
    }
  }, [form.name]);

  const handleChange = (key: keyof BasicProfileInput, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      setSubmitting(true);
      // 第一步：调用后端 BaZi 预计算接口，将出生日期/时间/地点转换为四柱与大运信息
      const baziResult: BaziResult = await calculateBazi(token, form);

      const birthYear = (() => {
        if (!form.birthDate) return new Date().getFullYear();
        const yearStr = form.birthDate.split("-")[0];
        const n = Number(yearStr);
        return Number.isFinite(n) && n > 0 ? n : new Date().getFullYear();
      })();

      const analysisPayload: AnalysisInput = {
        name: form.name,
        gender: form.gender,
        birth_year: birthYear,
        year_pillar: `${baziResult.bazi.year.gan}${baziResult.bazi.year.zhi}`,
        month_pillar: `${baziResult.bazi.month.gan}${baziResult.bazi.month.zhi}`,
        day_pillar: `${baziResult.bazi.day.gan}${baziResult.bazi.day.zhi}`,
        hour_pillar: `${baziResult.bazi.hour.gan}${baziResult.bazi.hour.zhi}`,
        start_age: baziResult.startAge,
        first_da_yun: baziResult.daYun && baziResult.daYun.length > 0 ? baziResult.daYun[0] : "",
        birthDate: form.birthDate,
        birthTime: form.birthTime,
        birthLocation: form.birthLocation
      };

      const created = await createAnalysis(token, analysisPayload);

      if (typeof window !== "undefined") {
        try {
          const storageKey = `life_bull_bazi_${created.id}`;
          window.localStorage.setItem(storageKey, JSON.stringify(baziResult));
        } catch (storageErr) {
          console.error("store baziResult failed", storageErr);
        }
      }

      navigate(`/bazi/${created.id}`, { state: { baziResult } });
    } catch (e: any) {
      setError(e.message || "创建分析任务失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReferral = async () => {
    if (!inviteInfo?.myReferralUrl) return;
    try {
      await navigator.clipboard.writeText(inviteInfo.myReferralUrl);
      setCopyHint("已复制");
      window.setTimeout(() => {
        setCopyHint(null);
      }, 1500);
    } catch (err) {
      console.error("copy referral failed", err);
    }
  };

  const handleLogoutClick = () => {
    setToken(null);
    navigate("/auth", { replace: true });
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
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start"
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
                  color: "#111827",
                  fontFamily: "CeniuTitle, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
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
          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: 56,
                right: 16,
                width: 160,
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1)",
                overflow: "hidden",
                zIndex: 20
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "#374151",
                  borderBottom: "1px solid #f3f4f6"
                }}
              >
                {displayName || "未知用户"}
              </div>
              <button
                type="button"
                onClick={handleLogoutClick}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "#b91c1c",
                  background: "#fff",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                退出登录
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowMenu(prev => !prev)}
            style={{
              marginLeft: "auto",
              width: 32,
              height: 32,
              border: "none",
              background: "transparent",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <img
              src={menuIcon}
              alt="菜单"
              style={{ width: 24, height: 24 }}
            />
          </button>
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
            以易经观变，以数据成形，
            <br />
            让百年人生显现为一条折线
            <br />
            <br />
            看见起伏 理解节奏 把握转折
          </p>
        </section>

        {/* 八字排盘表单卡片：字段与分组对齐新版 InputForm（只填出生信息） */}
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
                输入您的出生信息以进行 AI 分析
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {/* 姓名 + 性别切换 */}
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
                    placeholder="您的姓名"
                  />
                </label>
                <div style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                  性别
                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      background: "#f3f4f6",
                      borderRadius: 8,
                      padding: 4,
                      gap: 4
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleChange("gender", "Female")}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        background: form.gender === "Female" ? "#ffffff" : "transparent",
                        color: form.gender === "Female" ? "#db2777" : "#6b7280",
                        boxShadow:
                          form.gender === "Female" ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                      }}
                    >
                      坤造 (女)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange("gender", "Male")}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        background: form.gender === "Male" ? "#ffffff" : "transparent",
                        color: form.gender === "Male" ? "#4f46e5" : "#6b7280",
                        boxShadow:
                          form.gender === "Male" ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                      }}
                    >
                      乾造 (男)
                    </button>
                  </div>
                </div>
              </div>

              {/* 出生日期 */}
              <label style={{ fontSize: 14, color: "#374151" }}>
                出生日期（公历）
                <input
                  type="date"
                  required
                  value={form.birthDate}
                  onChange={e => handleChange("birthDate", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    marginTop: 4,
                    borderRadius: 8,
                    border: "1px solid #d1d5db"
                  }}
                />
              </label>

              {/* 出生时间 */}
              <label style={{ fontSize: 14, color: "#374151" }}>
                出生时间
                <input
                  type="time"
                  required
                  value={form.birthTime}
                  onChange={e => handleChange("birthTime", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    marginTop: 4,
                    borderRadius: 8,
                    border: "1px solid #d1d5db"
                  }}
                />
              </label>

              {/* 出生地点 */}
              <label style={{ fontSize: 14, color: "#374151" }}>
                出生地点
                <input
                  type="text"
                  required
                  value={form.birthLocation}
                  onChange={e => handleChange("birthLocation", e.target.value)}
                  placeholder="例如：中国上海"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    marginTop: 4,
                    borderRadius: 8,
                    border: "1px solid #d1d5db"
                  }}
                />
              </label>

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
                {submitting ? "AI 正在排盘，请稍候..." : "开始排盘"}
              </button>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#9ca3af"
                }}
              >
                预计需 10–20 秒，请保持页面打开。
              </p>
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
              AI 会根据您的出生信息自动进行八字排盘（查万年历、计算真太阳时、推导大运），然后生成 100 年人生 K 线图。
            </div>
          </div>
        </section>

        {/* 邀请区块：仅在加载中或有数据时展示，避免孤立标题 */}
        {(loadingUser || inviteInfo) && (
          <section>
            <h2
              style={{
                fontSize: 18,
                marginBottom: 8,
                color: "#1f2937"
              }}
            >
              邀请好友，获得更多次数
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
                  每成功推荐5人，获得+1次额外机会
                </p>
                <p style={{ marginBottom: 4, fontSize: 13, color: "#4b5563" }}>
                  今日剩余次数：{inviteInfo.todayRemaining}/
                  {inviteInfo.todayBaseQuota + inviteInfo.todayExtraQuota}
                </p>
                <p style={{ marginBottom: 4, fontSize: 13, color: "#4b5563" }}>
                  基础 {inviteInfo.todayBaseQuota} 次 / 推广 {inviteInfo.todayExtraQuota} 次
                </p>
                <p style={{ marginBottom: 4, fontSize: 13, color: "#4b5563" }}>
                  累计推荐：{inviteInfo.totalInvited} 人，今日获得：{inviteInfo.invitedToday} 人
                </p>
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      marginBottom: 4,
                      fontSize: 12,
                      color: "#4b5563"
                    }}
                  >
                    您的专属推广链接
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 9999,
                        border: "1px solid #e5e7eb",
                        background: "#ffffff",
                        fontSize: 12,
                        color: "#6b7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {inviteInfo.myReferralUrl}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyReferral}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: 2,
                        width: 66,
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "none",
                        background: "#ff4076",
                        fontSize: 12,
                        color: "#ffffff",
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <img
                        src={copyIcon}
                        alt="复制"
                        style={{ width: 14, height: 14 }}
                      />
                      <span>{copyHint || "复制"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
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
