import { useState } from "react";

export default function Step1Input({ onExtracted, apiBase }) {
  const [rawReport, setRawReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const base = apiBase || "";
  const url = `${base.replace(/\/$/, "")}/api/v1/extract-visit-report`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rawReport.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawReport: rawReport.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "請求失敗");
      if (!json.success) throw new Error(json.error || "抽取失敗");
      onExtracted(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>第一次拜訪報告（貼上全文）</label>
        <textarea
          value={rawReport}
          onChange={(e) => setRawReport(e.target.value)}
          rows={12}
          style={{ width: "100%", boxSizing: "border-box" }}
          placeholder="例：本次拜訪對象為 XX 科技，主要決策者為行銷經理王先生…"
        />
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "抽取中…" : "送出並抽取客戶資訊"}
      </button>
    </form>
  );
}
