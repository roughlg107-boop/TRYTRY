import { useState } from "react";
import Step1Input from "./pages/Step1Input.jsx";
import Step2TemplateSelect from "./pages/Step2TemplateSelect.jsx";
import Step3Generate from "./pages/Step3Generate.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function App() {
  const [step, setStep] = useState(1);
  const [extracted, setExtracted] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [generateResult, setGenerateResult] = useState(null);

  const goNext = () => setStep((s) => Math.min(s + 1, 3));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>成交型簡報生成系統</h1>
      <p>步驟：{step} / 3 — {step === 1 ? "輸入報告" : step === 2 ? "選擇範本" : "產出簡報"}</p>

      {step === 1 && (
        <Step1Input
          onExtracted={(data) => {
            setExtracted(data);
            goNext();
          }}
          apiBase={API_BASE}
        />
      )}

      {step === 2 && (
        <Step2TemplateSelect
          extracted={extracted}
          onSelected={(templateId, suggestData) => {
            setSelectedTemplateId(templateId);
            setSuggestions(suggestData);
            goNext();
          }}
          onBack={goBack}
          apiBase={API_BASE}
        />
      )}

      {step === 3 && (
        <Step3Generate
          extracted={extracted}
          selectedTemplateId={selectedTemplateId}
          onResult={setGenerateResult}
          onBack={goBack}
          apiBase={API_BASE}
        />
      )}
    </div>
  );
}
