import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendCode, verifyCode } from "../api";
import { useAuthToken } from "../hooks";
import logo from "../assets/logo.svg";

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setToken } = useAuthToken();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [inviterCode, setInviterCode] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill inviter code from ?ref=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      setInviterCode(ref);
    }
  }, [location.search]);

  // If already logged in, go to profile
  useEffect(() => {
    if (token) {
      navigate("/profile", { replace: true });
    }
  }, [token, navigate]);

  const handleSendCode = async () => {
    setError(null);
    try {
      setLoadingSend(true);
      await sendCode(phone);
    } catch (e: any) {
      setError(e.message || "发送验证码失败");
    } finally {
      setLoadingSend(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoadingSubmit(true);
      const result = await verifyCode(phone, code, inviterCode || undefined);
      setToken(result.access_token);
      navigate("/profile", { replace: true });
    } catch (e: any) {
      setError(e.message || "登录失败");
    } finally {
      setLoadingSubmit(false);
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
            maxWidth: 420,
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24
        }}
      >
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 320
          }}
        >
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

        <section
          style={{
            width: "100%",
            maxWidth: 360
          }}
        >
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
              <h2
                style={{
                  fontSize: 22,
                  lineHeight: "28px",
                  marginBottom: 4,
                  color: "#1f2937"
                }}
              >
                八字排盘登录
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280"
                }}
              >
                填写邀请码并使用手机号登录，开启你的人生牛市。
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <label style={{ fontSize: 14, color: "#374151" }}>
                邀请码（可选）
                <input
                  type="text"
                  value={inviterCode}
                  onChange={e => setInviterCode(e.target.value)}
                  placeholder="请输入邀请码"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    marginTop: 4,
                    borderRadius: 8,
                    border: "1px solid #d1d5db"
                  }}
                />
              </label>

              <label style={{ fontSize: 14, color: "#374151" }}>
                手机号
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
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
                <label
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "#374151"
                  }}
                >
                  验证码
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      marginTop: 4,
                      borderRadius: 8,
                      border: "1px solid #d1d5db"
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loadingSend || !phone}
                  style={{
                    marginTop: 24,
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    color: loadingSend || !phone ? "#9ca3af" : "#111827",
                    backgroundColor: "#f3f4f6",
                    cursor: loadingSend || !phone ? "not-allowed" : "pointer"
                  }}
                >
                  {loadingSend ? "发送中..." : "发送验证码"}
                </button>
              </div>

              {error && (
                <div style={{ color: "red", fontSize: 12 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingSubmit}
                style={{
                  marginTop: 8,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  color: "#ffffff",
                  fontSize: 16,
                  cursor: loadingSubmit ? "default" : "pointer",
                  background:
                    "linear-gradient(93.33deg, rgba(254,9,70,1) 4%, rgba(184,13,24,1) 52%, rgba(45,45,45,1) 100%)",
                  boxShadow:
                    "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)"
                }}
              >
                {loadingSubmit ? "登录中..." : "打开我的人生牛市"}
              </button>
            </form>
          </div>

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
            请通过专属渠道获取邀请码，再回来完成登录。
          </div>
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
