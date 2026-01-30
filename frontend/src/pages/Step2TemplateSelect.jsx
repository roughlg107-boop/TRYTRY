import { useState, useEffect } from "react";

const sectionLabel = { fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 };
const btnBase = { padding: "12px 24px", borderRadius: "var(--radius)", border: "none", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer" };

export default function Step2TemplateSelect({ extracted, onSelected, onBack, apiBase }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const base = apiBase || "";
  const suggestUrl = `${base.replace(/\/$/, "")}/api/v1/suggest-templates`;

  useEffect(() => {
    if (!extracted) return;
    setLoading(true);
    setError(null);
    fetch(suggestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extractedClientInfo: extracted })
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || "取得建議失敗");
        setSuggestions(json.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [extracted, suggestUrl]);

  const handleConfirm = () => {
    if (!selectedId || !suggestions) return;
    onSelected(selectedId, suggestions);
  };

  if (loading) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9375rem" }}>
        正在取得範本建議…
      </div>
    );
  }
  if (error) {
    return <p style={{ color: "var(--error)", fontSize: "0.9375rem" }}>{error}</p>;
  }
  if (!suggestions) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>尚無資料</p>;
  }

  const available = suggestions.available_templates || [];
  const excluded = suggestions.excluded_templates || [];

  return (
    <div>
      <span style={sectionLabel}>抽取結果摘要</span>
      <pre
        style={{
          background: "var(--bg-input)",
          padding: 14,
          overflow: "auto",
          maxHeight: 100,
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          fontSize: "0.8125rem",
          lineHeight: 1.5,
          marginBottom: 20
        }}
      >
        {JSON.stringify(extracted, null, 2).slice(0, 480)}…
      </pre>

      {excluded.length > 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: 20 }}>
          已排除：{excluded.map((e) => e.template_id).join("、")}
        </p>
      )}

      <span style={{ ...sectionLabel, display: "block", marginTop: 24 }}>選擇範本（必選）</span>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
        {available.map((t) => (
          <li key={t.template_id} style={{ marginBottom: 10 }}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                cursor: "pointer",
                padding: 14,
                borderRadius: "var(--radius)",
                border: "2px solid " + (selectedId === t.template_id ? "var(--accent)" : "var(--border)"),
                background: selectedId === t.template_id ? "var(--accent-soft)" : "var(--bg-input)",
                transition: "border-color 0.2s, background 0.2s"
              }}
            >
              <input
                type="radio"
                name="template"
                value={t.template_id}
                checked={selectedId === t.template_id}
                onChange={() => setSelectedId(t.template_id)}
                style={{ marginTop: 3, accentColor: "var(--accent)" }}
              />
              <div>
                <span style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.9375rem" }}>{t.template_name}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginLeft: 6 }}>({t.template_id})</span>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginTop: 4 }}>{t.why_not_excluded}</div>
              </div>
            </label>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button type="button" onClick={onBack} style={{ ...btnBase, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)" }}>
          上一步
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedId}
          style={{ ...btnBase, background: "var(--accent)", color: "#fff" }}
        >
          確認並產出簡報
        </button>
      </div>
    </div>
  );
}
