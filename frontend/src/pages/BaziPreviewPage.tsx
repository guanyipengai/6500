import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthToken } from "../hooks";

export const BaziPreviewPage: React.FC = () => {
  const { token } = useAuthToken();
  const params = useParams<{ analysisId: string }>();
  const navigate = useNavigate();

  const analysisId = params.analysisId;

  if (!token) {
    navigate("/auth", { replace: true });
    return null;
  }

  const handleNext = () => {
    if (analysisId) {
      navigate(`/result/${analysisId}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>基础命理信息预览</h1>
      <p style={{ marginBottom: 16, fontSize: 14 }}>
        当前步骤用于展示你刚刚填写的命盘信息。后端的大师正在根据这些信息推演完整人生 K 线。
      </p>
      <p style={{ marginBottom: 8, fontSize: 14 }}>分析任务 ID：{analysisId}</p>

      <button onClick={handleNext} style={{ padding: 10, marginTop: 16 }}>
        开启我的人生牛市
      </button>
    </div>
  );
};

