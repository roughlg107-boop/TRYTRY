import { useState } from "react";
import Step1Input from "./pages/Step1Input.jsx";
import Step2TemplateSelect from "./pages/Step2TemplateSelect.jsx";
import Step3Generate from "./pages/Step3Generate.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const STEP_LABELS = ["輸入報告", "選擇範本", "產出簡報"];

export default function App() {
  const [step, setStep] = useState(1);
  const [extracted, setExtracted] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [generateResult, setGenerateResult] = useState(null);

  const goNext = () => setStep((s) => Math.min(s + 1, 3));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="app" style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>成交型簡報生成系統</h1>
        <p style={styles.subtitle}>業務決策輔助 × 簡報模板填空</p>
      </header>

      <nav className="stepper" style={styles.stepper}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <div className={`stepper-item ${step === s ? "active" : step > s ? "done" : ""}`}>
              <span className="stepper-dot">{step > s ? "✓" : s}</span>
              <span className="stepper-label">{STEP_LABELS[s - 1]}</span>
            </div>
            {s < 3 && <span className="stepper-line" style={{ margin: "0 4px" }} />}
          </div>
        ))}
      </nav>

      <main style={styles.main}>
        <div className="card" style={styles.card}>
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
      </main>

      <footer style={styles.footer}>
        <span style={styles.footerText}>依既定模板填入內容 · 範本選擇權在使用者</span>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    maxWidth: 720,
    margin: "0 auto",
    padding: "32px 24px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 0
  },
  header: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: "1px solid var(--border)"
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "var(--text)"
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: "0.875rem",
    color: "var(--text-muted)",
    fontWeight: 400
  },
  stepper: {
    marginBottom: 28
  },
  main: {
    flex: 1
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: 28,
    boxShadow: "var(--shadow-sm)"
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTop: "1px solid var(--border)",
    textAlign: "center"
  },
  footerText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)"
  }
};
