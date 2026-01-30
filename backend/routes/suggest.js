import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadTemplates() {
  const path = join(__dirname, "..", "..", "shared", "templates.json");
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

function flattenClientInfo(info) {
  const s = JSON.stringify(info);
  return s;
}

function isExcluded(template, clientText) {
  for (const condition of template.absolute_exclusion_conditions || []) {
    const normalized = condition
      .replace(/報告中明確提及/g, "")
      .replace(/或/g, " ")
      .replace(/且/g, " ")
      .trim();
    const parts = normalized.split(/\s+/).filter((p) => p.length >= 2);
    const matched = parts.some((p) => clientText.includes(p));
    if (matched) return { matched: true, reason: condition };
  }
  return { matched: false };
}

const router = Router();

router.post("/", (req, res) => {
  try {
    const { extractedClientInfo } = req.body || {};
    if (!extractedClientInfo || typeof extractedClientInfo !== "object") {
      return res.status(400).json({
        success: false,
        error: "extractedClientInfo is required"
      });
    }
    const clientText = flattenClientInfo(extractedClientInfo);
    const templates = loadTemplates();
    const list = Array.isArray(templates) ? templates : Object.values(templates);

    const excluded_templates = [];
    const available_templates = [];

    for (const t of list) {
      const result = isExcluded(t, clientText);
      if (result.matched) {
        excluded_templates.push({ template_id: t.template_id, reason: result.reason });
      } else {
        available_templates.push({
          template_id: t.template_id,
          template_name: t.template_name,
          why_not_excluded: "未觸發排除條件"
        });
      }
    }

    res.json({
      success: true,
      data: { excluded_templates, available_templates }
    });
  } catch (err) {
    console.error("suggest error", err);
    res.status(502).json({
      success: false,
      error: "Template suggestion service unavailable"
    });
  }
});

export default router;
