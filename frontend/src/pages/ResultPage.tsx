import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAnalysis, getMe, type AnalysisDetail } from "../api";
import { useAuthToken } from "../hooks";
import type { LifeDestinyResult } from "../types";
import { AnalysisResult } from "../components/AnalysisResult";
import { LifeKLineChart } from "../components/LifeKLineChart";

export const ResultPage: React.FC = () => {
  const { token } = useAuthToken();
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

  if (!token) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, maxWidth: 1024, margin: "0 auto" }}>
      <header style={{ marginBottom: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>人生牛市 · 分析结果</h1>
        <p style={{ fontSize: 13, color: "#555" }}>结合八字命理与 AI 推演，为你绘制 100 年人生 K 线。</p>
      </header>

      {error && <p style={{ color: "red", marginBottom: 16 }}>{error}</p>}

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
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>邀请好友，获得更多测算次数</h2>
        {inviteInfo && (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #eee",
              padding: 12,
              background: "#faf5ff"
            }}
          >
            <p style={{ marginBottom: 4 }}>
              今日剩余次数：{inviteInfo.todayRemaining}（基础 {inviteInfo.todayBaseQuota} 次 / 推广{" "}
              {inviteInfo.todayExtraQuota} 次）
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
