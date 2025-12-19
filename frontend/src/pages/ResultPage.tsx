import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAnalysis, getMe, type AnalysisDetail } from "../api";
import { useAuthToken } from "../hooks";
import type { LifeDestinyResult } from "../types";
import { AnalysisResult } from "../components/AnalysisResult";
import { LifeKLineChart } from "../components/LifeKLineChart";
import copyIcon from "../assets/copy-alt.svg";
import logo from "../assets/logo.svg";
import menuIcon from "../assets/menu.svg";

export const ResultPage: React.FC = () => {
  const { token, setToken } = useAuthToken();
  const params = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [lifeResult, setLifeResult] = useState<LifeDestinyResult | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    todayBaseQuota: number;
    todayExtraQuota: number;
    todayRemaining: number;
    totalInvited: number;
    invitedToday: number;
    myReferralUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const analysisId = params.analysisId ? Number(params.analysisId) : NaN;

  useEffect(() => {
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!analysisId || Number.isNaN(analysisId)) {
      return;
    }

    let timer: number | undefined;
    const fetchAnalysis = async () => {
      try {
        const detail = await getAnalysis(token, analysisId);
        setAnalysis(detail);
        if (detail.status === "done" && detail.output) {
          const raw = detail.output as any;
          const result: LifeDestinyResult = {
            chartData: raw.chartPoints || [],
            analysis: {
              bazi: raw.bazi || [],
              summary: raw.summary || "",
              summaryScore: raw.summaryScore ?? 5,
              personality: raw.personality || "",
              personalityScore: raw.personalityScore ?? 5,
              industry: raw.industry || "",
              industryScore: raw.industryScore ?? 5,
              fengShui: raw.fengShui || "",
              fengShuiScore: raw.fengShuiScore ?? 5,
              wealth: raw.wealth || "",
              wealthScore: raw.wealthScore ?? 5,
              marriage: raw.marriage || "",
              marriageScore: raw.marriageScore ?? 5,
              health: raw.health || "",
              healthScore: raw.healthScore ?? 5,
              family: raw.family || "",
              familyScore: raw.familyScore ?? 5,
              crypto: raw.crypto || "",
              cryptoScore: raw.cryptoScore ?? 5,
              cryptoYear: raw.cryptoYear || "",
              cryptoStyle: raw.cryptoStyle || ""
            }
          };
          setLifeResult(result);
        } else if (detail.status === "pending") {
          timer = window.setTimeout(fetchAnalysis, 3000);
        }
      } catch (e: any) {
        setError(e.message || "获取分析任务失败");
      }
    };

    fetchAnalysis();

    const fetchMe = async () => {
      try {
        const me = await getMe(token);
        setInviteInfo({
          todayBaseQuota: me.todayBaseQuota,
          todayExtraQuota: me.todayExtraQuota,
          todayRemaining: me.todayRemaining,
          totalInvited: me.totalInvited,
          invitedToday: me.invitedToday,
          myReferralUrl: me.myReferralUrl
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchMe();

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [token, navigate, analysisId]);

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

  const [displayName, setDisplayName] = useState("未知用户");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("life_bull_display_name");
    if (stored && stored.trim()) {
      setDisplayName(stored);
    }
  }, []);

  const handleLogoutClick = () => {
    setToken(null);
    navigate("/auth", { replace: true });
  };

  if (!token) {
    return null;
  }

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
            justifyContent: "center"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "0 auto"
            }}
          >
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
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
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
          maxWidth: 1024,
          margin: "0 auto",
          width: "100%"
        }}
      >
        <header style={{ marginBottom: 24, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 24,
              marginBottom: 8,
              color: "#1f2937"
            }}
          >
            人生牛市
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#4b5563"
            }}
          >
            命运有其波动 · 洞见人生牛市
          </p>
        </header>

        {error && <p style={{ color: "red", marginBottom: 16 }}>{error}</p>}

        {!analysis && !error && <p>加载中...</p>}

        {analysis && analysis.status === "pending" && (
          <section style={{ marginBottom: 24 }}>
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(254,242,242,1) 0%, rgba(255,247,237,1) 100%)",
                borderRadius: 12,
                border: "1px solid #fed7d7",
                padding: 16,
                boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
                maxWidth: 640,
                margin: "0 auto"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "9999px",
                    border: "2px solid rgba(248,113,113,0.4)",
                    borderTopColor: "#f97373",
                    animation: "spin 1s linear infinite"
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    color: "#b91c1c",
                    fontWeight: 600
                  }}
                >
                  AI 正在推演你的人生 K 线
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#4b5563",
                  marginBottom: 4
                }}
              >
                预计 3–5 分钟完成，请保持页面打开。期间我们会结合你的命盘信息，生成 100 年人生运势曲线和多维度分析。
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#9ca3af"
                }}
              >
                提示：结果准备好后，页面会自动更新，无需手动刷新。
              </p>
            </div>
          </section>
        )}

        {analysis && analysis.status === "error" && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: "red" }}>分析失败：{analysis.error_message}</p>
          </div>
        )}

        {lifeResult && (
          <>
            <section style={{ marginBottom: 32 }}>
              <AnalysisResult analysis={lifeResult.analysis} />
            </section>

            <section style={{ marginBottom: 32 }}>
              <LifeKLineChart data={lifeResult.chartData} />
            </section>
          </>
        )}

        <section style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 18,
              marginBottom: 8,
              color: "#1f2937"
            }}
          >
            邀请好友，获得更多次数
          </h2>
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
              <p
                style={{
                  marginBottom: 4,
                  fontSize: 14,
                  color: "#1f2937"
                }}
              >
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
              <p
                style={{
                  marginBottom: 4,
                  fontSize: 12,
                  color: "#555"
                }}
              >
                规则：分享链接给朋友，每有1人完成测算，你就获得+1次机会。每天最多获得10次。
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
