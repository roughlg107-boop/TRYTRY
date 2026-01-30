import { useState, useEffect } from "react";

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

  if (loading) return <p>正在取得範本建議…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!suggestions) return <p>尚無資料</p>;

  const available = suggestions.available_templates || [];
  const excluded = suggestions.excluded_templates || [];

  return (
    <div>
      <p>STEP 1 抽取結果（摘要）：</p>
      <pre style={{ background: "#f5f5f5", padding: 12, overflow: "auto", maxHeight: 120 }}>
        {JSON.stringify(extracted, null, 2).slice(0, 500)}…
      </pre>

      {excluded.length > 0 && (
        <p>已排除範本：{excluded.map((e) => `${e.template_id}（${e.reason}）`).join("、")}</p>
      )}

      <p>請選擇一個範本（必選）：</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {available.map((t) => (
          <li key={t.template_id} style={{ marginBottom: 8 }}>
            <label>
              <input
                type="radio"
                name="template"
                value={t.template_id}
                checked={selectedId === t.template_id}
                onChange={() => setSelectedId(t.template_id)}
              />
              {" "}{t.template_name}（{t.template_id}）— {t.why_not_excluded}
            </label>
          </li>
        ))}
      </ul>

      <button onClick={onBack}>上一步</button>
      <button onClick={handleConfirm} disabled={!selectedId} style={{ marginLeft: 8 }}>
        確認並產出簡報
      </button>
    </div>
  );
}
