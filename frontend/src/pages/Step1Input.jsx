import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// 使用與 pdfjs-dist 同版本的 worker，避免 API 與 Worker 版本不符
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ACCEPT = ".txt,.pdf,application/pdf,.docx,.doc,.jpg,.jpeg,.png";
const STYLES = {
  form: { width: "100%" },
  sectionLabel: { fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 },
  dropZone: {
    border: "2px dashed var(--border)",
    borderRadius: "var(--radius)",
    padding: "28px 20px",
    textAlign: "center",
    background: "var(--bg-input)",
    color: "var(--text-muted)",
    cursor: "pointer",
    marginBottom: 20,
    transition: "border-color 0.2s, background 0.2s"
  },
  dropZoneActive: { borderColor: "var(--accent)", background: "var(--accent-soft)" },
  dropZoneText: { fontSize: "0.9375rem", display: "block", marginBottom: 4 },
  dropZoneHint: { fontSize: "0.8125rem", opacity: 0.85 },
  label: { display: "block", marginBottom: 10, fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: 14,
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    color: "var(--text)",
    fontSize: "0.9375rem",
    lineHeight: 1.6,
    minHeight: 140,
    resize: "vertical",
    outline: "none"
  },
  error: { fontSize: "0.875rem", color: "var(--error)", marginTop: 12 },
  button: {
    marginTop: 20,
    padding: "12px 24px",
    borderRadius: "var(--radius)",
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    fontSize: "0.9375rem",
    fontWeight: 600
  }
};

async function extractTextFromFile(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".txt")) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result || "");
      r.onerror = () => reject(new Error("無法讀取文字檔"));
      r.readAsText(file, "UTF-8");
    });
  }
  if (name.endsWith(".pdf")) {
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const numPages = pdf.numPages;
    const parts = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      parts.push(text);
    }
    const out = parts.join("\n\n").trim();
    if (!out) throw new Error("此 PDF 可能為掃描檔或圖片，無法擷取文字。請改貼文字或上傳可選取文字的 PDF。");
    return out;
  }
  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    const mammoth = await import("mammoth");
    const data = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: data });
    return result.value || "";
  }
  if (/\.(jpg|jpeg|png)$/i.test(name)) {
    const Tesseract = (await import("tesseract.js")).default;
    const { data } = await Tesseract.recognize(file, "chi_tra+eng", {
      logger: () => {}
    });
    return data.text || "";
  }
  throw new Error("不支援的檔案類型，請使用 .txt / .pdf / .docx / .jpg / .png");
}

export default function Step1Input({ onExtracted, apiBase }) {
  const [rawReport, setRawReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const base = apiBase || "";
  const url = `${base.replace(/\/$/, "")}/api/v1/extract-visit-report`;

  const handleFile = async (file) => {
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    const allowed = [".txt", ".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"];
    if (!allowed.some((ext) => name.endsWith(ext))) {
      setError("請選擇 .txt、.pdf、.docx、.jpg 或 .png 檔案");
      return;
    }
    setFileLoading(true);
    setError(null);
    try {
      const text = await extractTextFromFile(file);
      setRawReport((prev) => (prev ? prev + "\n\n" + text : text));
    } catch (err) {
      setError(err.message || "無法讀取檔案內容");
    } finally {
      setFileLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDrag(true);
  };

  const onDragLeave = () => setDrag(false);

  const onSelectFile = (e) => {
    const file = e.target?.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

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
    <form onSubmit={handleSubmit} style={STYLES.form}>
      <span style={STYLES.sectionLabel}>上傳或貼上</span>
      <div
        style={{ ...STYLES.dropZone, ...(drag ? STYLES.dropZoneActive : {}) }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onSelectFile}
          style={{ display: "none" }}
        />
        {fileLoading ? (
          <span>正在讀取檔案…（PDF 較大時可能需數秒）</span>
        ) : (
          <>
            <span style={STYLES.dropZoneText}>可丟入 PDF、Word、文字檔或圖片</span>
            <span style={STYLES.dropZoneHint}>拖曳檔案到這裡，或點擊選擇 · 支援 .pdf · .txt · .docx · .jpg · .png</span>
          </>
        )}
      </div>

      <label style={STYLES.label}>第一次拜訪報告內容</label>
      <textarea
        value={rawReport}
        onChange={(e) => setRawReport(e.target.value)}
        rows={12}
        style={STYLES.textarea}
        placeholder="例：本次拜訪對象為 XX 科技，主要決策者為行銷經理王先生…"
      />

      {error && <p style={STYLES.error}>{error}</p>}
      <button type="submit" disabled={loading || !rawReport.trim()} style={STYLES.button}>
        {loading ? "抽取中…" : "送出並抽取客戶資訊"}
      </button>
    </form>
  );
}
