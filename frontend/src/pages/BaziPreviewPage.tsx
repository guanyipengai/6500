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
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        display: "flex",
        flexDirection: "column"
      }}
    >
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
            基础命理信息预览
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#4b5563"
            }}
          >
            请确认以下命盘信息是否正确，后端大师将基于该信息推演完整人生 K 线和分析报告。
          </p>
        </section>

        {error && <p style={{ color: "red", marginBottom: 16 }}>{error}</p>}

        {!analysis && !error && <p>加载中...</p>}

        {input && (
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
            <h2
              style={{
                fontSize: 18,
                marginBottom: 12,
                color: "#1f2937"
              }}
            >
              基本信息
            </h2>
            <p style={{ marginBottom: 4 }}>姓名：{input.name || "未填写"}</p>
            <p style={{ marginBottom: 4 }}>
              性别：{input.gender === "Male" ? "乾造 (男)" : "坤造 (女)"}
            </p>
            <p style={{ marginBottom: 4 }}>出生年份（阳历）：{input.birth_year}</p>

            <h3
              style={{
                fontSize: 16,
                marginTop: 12,
                marginBottom: 8
              }}
            >
              四柱干支
            </h3>
            <p style={{ marginBottom: 4 }}>年柱：{input.year_pillar}</p>
            <p style={{ marginBottom: 4 }}>月柱：{input.month_pillar}</p>
            <p style={{ marginBottom: 4 }}>日柱：{input.day_pillar}</p>
            <p style={{ marginBottom: 4 }}>时柱：{input.hour_pillar}</p>

            <h3
              style={{
                fontSize: 16,
                marginTop: 12,
                marginBottom: 8
              }}
            >
              大运信息
            </h3>
            <p style={{ marginBottom: 4 }}>起运年龄（虚岁）：{input.start_age}</p>
            <p style={{ marginBottom: 4 }}>第一步大运：{input.first_da_yun}</p>
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
