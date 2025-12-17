import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthToken } from "../hooks";
import { getAnalysis, type AnalysisDetail } from "../api";

export const BaziPreviewPage: React.FC = () => {
  const { token } = useAuthToken();
  const params = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!token) {
    return null;
  }

  const handleNext = () => {
    if (!Number.isNaN(analysisIdNumber)) {
      navigate(`/result/${analysisIdNumber}`);
    }
  };

  const input = analysis?.input;

  return (
    <div style={{ minHeight: "100vh", padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <section style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>基础命理信息预览</h1>
        <p style={{ fontSize: 13, color: "#555" }}>
          请确认以下命盘信息是否正确，后端大师将基于该信息推演完整人生 K 线和分析报告。
        </p>
      </section>

      {error && <p style={{ color: "red", marginBottom: 16 }}>{error}</p>}

      {!analysis && !error && <p>加载中...</p>}

      {input && (
        <section
          style={{
            borderRadius: 12,
            border: "1px solid #eee",
            padding: 16,
            marginBottom: 24
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>基本信息</h2>
          <p style={{ marginBottom: 4 }}>姓名：{input.name || "未填写"}</p>
          <p style={{ marginBottom: 4 }}>性别：{input.gender === "Male" ? "乾造 (男)" : "坤造 (女)"}</p>
          <p style={{ marginBottom: 4 }}>出生年份（阳历）：{input.birth_year}</p>

          <h3 style={{ fontSize: 16, marginTop: 12, marginBottom: 8 }}>四柱干支</h3>
          <p style={{ marginBottom: 4 }}>年柱：{input.year_pillar}</p>
          <p style={{ marginBottom: 4 }}>月柱：{input.month_pillar}</p>
          <p style={{ marginBottom: 4 }}>日柱：{input.day_pillar}</p>
          <p style={{ marginBottom: 4 }}>时柱：{input.hour_pillar}</p>

          <h3 style={{ fontSize: 16, marginTop: 12, marginBottom: 8 }}>大运信息</h3>
          <p style={{ marginBottom: 4 }}>起运年龄（虚岁）：{input.start_age}</p>
          <p style={{ marginBottom: 4 }}>第一步大运：{input.first_da_yun}</p>
        </section>
      )}

      <button onClick={handleNext} style={{ padding: 10, marginTop: 8 }}>
        开启我的人生牛市
      </button>
    </div>
  );
};
