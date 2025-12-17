import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAnalysis, getMe, type AnalysisDetail } from "../api";
import { useAuthToken } from "../hooks";

export const ResultPage: React.FC = () => {
  const { token } = useAuthToken();
  const params = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    todayRemaining: number;
    myReferralUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (detail.status === "pending") {
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
          todayRemaining: me.todayRemaining,
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

  if (!token) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>人生牛市 · 分析结果</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!analysis && !error && <p>加载中...</p>}

      {analysis && analysis.status === "pending" && (
        <div style={{ marginBottom: 24 }}>
          <p>大师推演中（约 3–5 分钟），请稍候...</p>
        </div>
      )}

      {analysis && analysis.status === "error" && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "red" }}>分析失败：{analysis.error_message}</p>
        </div>
      )}

      {analysis && analysis.status === "done" && (
        <div style={{ marginBottom: 24 }}>
          <p>分析已完成（ID：{analysis.id}）。</p>
          <p style={{ fontSize: 12, color: "#555" }}>后续会在这里接入详细分析卡片和 K 线图。</p>
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>邀请好友，获得更多测算次数</h2>
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

