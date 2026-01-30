import { useState, useEffect } from "react";

const sectionLabel = { fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 };
const btnBase = { padding: "12px 24px", borderRadius: "var(--radius)", border: "none", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer" };

export default function Step3Generate({
  extracted,
  selectedTemplateId,
  onResult,
  onBack,
  apiBase
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const base = apiBase || "";
  const url = `${base.replace(/\/$/, "")}/api/v1/generate-presentation`;

  useEffect(() => {
    if (!extracted || !selectedTemplateId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: selectedTemplateId,
        extractedClientInfo: extracted
      })
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || "產出失敗");
        setResult(json.data);
        onResult(json.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [extracted, selectedTemplateId, url]);

  if (loading) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9375rem" }}>
        正在產出簡報並執行安全檢查…
      </div>
    );
  }
  if (error) {
    return <p style={{ color: "var(--error)", fontSize: "0.9375rem" }}>{error}</p>;
  }
  if (!result) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>尚無結果</p>;
  }

  const guard = result.guardrailResult || {};
  const presentation = result.presentation || guard.final_output;
  const passed = guard.status === "pass" && presentation;

  return (
    <div>
      <span style={sectionLabel}>安全檢查</span>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: "var(--radius)",
          background: passed ? "rgba(63, 185, 80, 0.15)" : "rgba(248, 81, 73, 0.15)",
          color: passed ? "var(--success)" : "var(--error)",
          fontSize: "0.875rem",
          fontWeight: 600,
          marginBottom: 20
        }}
      >
        {passed ? "通過" : "未通過"}
      </div>

      {guard.violations && guard.violations.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: 8 }}>違規項目（僅顯示原因與位置）：</p>
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.7 }}>
            {guard.violations.map((v, i) => (
              <li key={i}>{v.type} — {v.description}（{v.location}）</li>
            ))}
          </ul>
        </div>
      )}

      {passed ? (
        <>
          <span style={{ ...sectionLabel, display: "block", marginTop: 24 }}>最終簡報（可複製貼入 PPT）</span>
          <pre
            style={{
              background: "var(--bg-input)",
              padding: 16,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: "0.8125rem",
              lineHeight: 1.6,
              marginBottom: 20
            }}
          >
            {JSON.stringify(presentation, null, 2)}
          </pre>
          {presentation.slides && (
            <div style={{ marginTop: 16 }}>
              {presentation.slides.map((s) => (
                <div
                  key={s.slide_number}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    padding: "14px 0",
                    color: "var(--text)"
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>第 {s.slide_number} 頁</span>
                  <div style={{ fontSize: "0.875rem", marginTop: 4 }}>{s.title}</div>
                  <div style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5 }}>{s.body}</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
          未通過安全檢查，不得下載或顯示為最終簡報。請依違規原因修正後重新產出。
        </p>
      )}

      <button
        type="button"
        onClick={onBack}
        style={{ ...btnBase, marginTop: 28, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)" }}
      >
        回到選擇範本
      </button>
    </div>
  );
}
