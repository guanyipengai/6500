import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuthToken } from "../hooks";
import { getAnalysis, type AnalysisDetail } from "../api";
import type { BaziResult } from "../types";
import logo from "../assets/logo.svg";
import menuIcon from "../assets/menu.svg";

export const BaziPreviewPage: React.FC = () => {
  const { token, setToken } = useAuthToken();
  const params = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("未知用户");
  const [showMenu, setShowMenu] = useState(false);
  const [baziResult, setBaziResult] = useState<BaziResult | null>(() => {
    const state = (location as any)?.state as { baziResult?: BaziResult } | undefined;
    return state?.baziResult || null;
  });

  const analysisIdNumber = params.analysisId ? Number(params.analysisId) : NaN;

  useEffect(() => {
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!analysisIdNumber || Number.isNaN(analysisIdNumber)) return;

    const fetchAnalysis = async () => {
      try {
        const detail = await getAnalysis(token, analysisIdNumber);
        setAnalysis(detail);
      } catch (e: any) {
        setError(e.message || "获取分析任务失败");
      }
    };
    fetchAnalysis();
  }, [token, navigate, analysisIdNumber]);

  // 从本地存储恢复 BaZi 结果（支持用户刷新页面）
  useEffect(() => {
    if (!analysisIdNumber || Number.isNaN(analysisIdNumber)) return;
    if (typeof window === "undefined") return;
    if (baziResult) return;
    try {
      const storageKey = `life_bull_bazi_${analysisIdNumber}`;
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as BaziResult;
        setBaziResult(parsed);
      }
    } catch (err) {
      console.error("load baziResult from storage failed", err);
    }
  }, [analysisIdNumber, baziResult]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("life_bull_display_name");
    if (stored && stored.trim()) {
      setDisplayName(stored);
    }
  }, []);

  if (!token) {
    return null;
  }

  const handleNext = () => {
    if (!Number.isNaN(analysisIdNumber)) {
      navigate(`/result/${analysisIdNumber}`);
    }
  };

  const input = baziResult?.userInput;

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
          width: "100%"
        }}
      >
        <section style={{ textAlign: "center", marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 22,
              marginBottom: 8,
              color: "#1f2937"
            }}
          >
            八字排盘完成
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#4b5563"
            }}
          >
            请确认以下命盘信息是否正确，无误后点击「开启AI分析」。
          </p>
        </section>

        {error && <p style={{ color: "red", marginBottom: 16 }}>{error}</p>}

        {!baziResult && !error && <p>排盘中，请稍候...</p>}

        {input && baziResult && (
          <section
            style={{
              background: "#ffffff",
              borderRadius: 16,
              border: "1px solid #f3f4f6",
              padding: 24,
              marginBottom: 24,
              boxShadow:
                "0px 20px 25px -5px rgba(0,0,0,0.05), 0px 8px 10px -6px rgba(0,0,0,0.05)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 9999,
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: "#16a34a"
                }}
              >
                ✓
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#16a34a"
                }}
              >
                八字排盘完成
              </div>
            </div>

            {/* 出生信息 */}
            <h2
              style={{
                fontSize: 18,
                marginBottom: 12,
                color: "#1f2937"
              }}
            >
              出生信息
            </h2>
            <div
              style={{
                marginBottom: 12,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                padding: 12,
                fontSize: 13,
                color: "#4b5563"
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", rowGap: 4 }}>
                <div style={{ flex: "1 1 50%" }}>姓名：{input.name || "未填写"}</div>
                <div style={{ flex: "1 1 50%" }}>
                  性别：{input.gender === "Male" ? "乾造 (男)" : "坤造 (女)"}
                </div>
                <div style={{ flex: "1 1 50%" }}>
                  出生日期：{input.birthDate} {input.birthTime}
                </div>
                <div style={{ flex: "1 1 50%" }}>
                  出生地点：{input.birthLocation || "未填写"}
                </div>
                <div style={{ flex: "1 1 50%" }}>
                  农历日期：{baziResult.lunarDate}
                </div>
                <div style={{ flex: "1 1 50%" }}>
                  真太阳时：{baziResult.solarTime}
                </div>
              </div>
            </div>

            <div
              style={{
                marginBottom: 16,
                background: "#fef3c7",
                borderRadius: 12,
                border: "1px solid #fde68a",
                padding: 12,
                fontSize: 12,
                color: "#92400e"
              }}
            >
              已根据出生地推算真太阳时并完成排盘，如与记忆不符，请以后续正式版为准。
            </div>

            {/* 四柱八字 */}
            <h3
              style={{
                fontSize: 16,
                marginTop: 16,
                marginBottom: 8
              }}
            >
              四柱八字
            </h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 12
              }}
            >
              {[
                { label: "年柱", value: `${baziResult.bazi.year.gan}${baziResult.bazi.year.zhi}` },
                { label: "月柱", value: `${baziResult.bazi.month.gan}${baziResult.bazi.month.zhi}` },
                { label: "日柱", value: `${baziResult.bazi.day.gan}${baziResult.bazi.day.zhi}` },
                { label: "时柱", value: `${baziResult.bazi.hour.gan}${baziResult.bazi.hour.zhi}` }
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    textAlign: "center",
                    flex: "1 1 22%",
                    minWidth: 72,
                    padding: "12px 8px",
                    borderRadius: 12,
                    background:
                      "linear-gradient(145deg, rgba(238,242,255,1) 0%, rgba(233,213,255,1) 100%)",
                    border: "1px solid #e0e7ff"
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b21a8",
                      marginBottom: 4
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      letterSpacing: 4,
                      color: "#1f2937"
                    }}
                  >
                    {item.value || "-"}
                  </div>
                </div>
              ))}
            </div>

            {/* 大运信息 */}
            <h3
              style={{
                fontSize: 16,
                marginTop: 12,
                marginBottom: 8
              }}
            >
              大运信息
            </h3>
            <p style={{ marginBottom: 4 }}>起运年龄（虚岁）：{baziResult.startAge}</p>
            <p style={{ marginBottom: 4 }}>
              大运方向：
              {baziResult.direction === "Forward" ? "顺行 (阳男/阴女)" : "逆行 (阴男/阳女)"}
            </p>

            {baziResult.daYun && baziResult.daYun.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <p
                  style={{
                    fontSize: 13,
                    color: "#4b5563",
                    marginBottom: 6
                  }}
                >
                  前几步大运（由左到右）：
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8
                  }}
                >
                  {baziResult.daYun.map((val, idx) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={`${val}-${idx}`}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 9999,
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        fontSize: 12,
                        color: "#374151"
                      }}
                    >
                      {idx + 1}. {val}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <button
          onClick={handleNext}
          style={{
            width: "100%",
            maxWidth: 360,
            height: 40,
            borderRadius: 8,
            border: "none",
            color: "#ffffff",
            fontSize: 16,
            cursor: "pointer",
            background:
              "linear-gradient(93.33deg, rgba(254,9,70,1) 4%, rgba(184,13,24,1) 52%, rgba(45,45,45,1) 100%)",
            boxShadow:
              "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)",
            display: "block",
            margin: "0 auto"
          }}
        >
          开启我的人生牛市
        </button>
      </main>
    </div>
  );
};
