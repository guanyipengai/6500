import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendCode, verifyCode } from "../api";
import { useAuthToken } from "../hooks";

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
    <div style={{ minHeight: "100vh", padding: "16px", maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>人生牛市 · 登录</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          手机号
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1 }}>
            验证码
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loadingSend || !phone}
            style={{ padding: "0 12px", marginTop: 24 }}
          >
            {loadingSend ? "发送中..." : "发送验证码"}
          </button>
        </div>
        <label>
          邀请码（可选）
          <input
            type="text"
            value={inviterCode}
            onChange={e => setInviterCode(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        {error && (
          <div style={{ color: "red", fontSize: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loadingSubmit} style={{ padding: 10, marginTop: 8 }}>
          {loadingSubmit ? "登录中..." : "注册 / 登录"}
        </button>
      </form>
    </div>
  );
};

