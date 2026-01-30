import { useState, useEffect } from "react";

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

  if (loading) return <p>正在產出簡報並執行安全檢查…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!result) return <p>尚無結果</p>;

  const guard = result.guardrailResult || {};
  const presentation = result.presentation || guard.final_output;
  const passed = guard.status === "pass" && presentation;

  return (
    <div>
      <p><strong>安全檢查：</strong> {guard.status === "pass" ? "通過" : "未通過"}</p>
      {guard.violations && guard.violations.length > 0 && (
        <div>
          <p>違規項目（僅顯示原因與位置，不顯示原始違規文字）：</p>
          <ul>
            {guard.violations.map((v, i) => (
              <li key={i}>{v.type} — {v.description}（{v.location}）</li>
            ))}
          </ul>
        </div>
      )}

      {passed ? (
        <div>
          <p>最終簡報（可複製貼入 PPT）：</p>
          <pre style={{ background: "#f5f5f5", padding: 12, overflow: "auto", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(presentation, null, 2)}
          </pre>
          {presentation.slides && (
            <div style={{ marginTop: 12 }}>
              {presentation.slides.map((s) => (
                <div key={s.slide_number} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
                  <strong>第 {s.slide_number} 頁</strong> — {s.title}
                  <div style={{ marginLeft: 12, color: "#333" }}>{s.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p>未通過安全檢查，不得下載或顯示為最終簡報。請依違規原因修正後重新產出。</p>
      )}

      <button onClick={onBack} style={{ marginTop: 16 }}>回到選擇範本</button>
    </div>
  );
}
