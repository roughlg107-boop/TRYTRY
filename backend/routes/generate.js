import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fillPresentation } from "../services/openai.js";
import { runGuard } from "./guard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadTemplates() {
  const path = join(__dirname, "..", "..", "shared", "templates.json");
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

function getTemplateById(templateId) {
  const data = loadTemplates();
  const list = Array.isArray(data) ? data : Object.values(data);
  return list.find((t) => t.template_id === templateId) || null;
}

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { template_id, extractedClientInfo } = req.body || {};
    if (!template_id || typeof template_id !== "string") {
      return res.status(400).json({
        success: false,
        error: "template_id is required"
      });
    }
    if (!extractedClientInfo || typeof extractedClientInfo !== "object") {
      return res.status(400).json({
        success: false,
        error: "extractedClientInfo is required"
      });
    }

    const template = getTemplateById(template_id);
    if (!template) {
      return res.status(400).json({
        success: false,
        error: "template_id not found"
      });
    }

    const presentation = await fillPresentation(template, extractedClientInfo);
    const guardResult = runGuard(presentation, template);

    if (guardResult.status === "fail") {
      return res.json({
        success: true,
        data: {
          guardrailResult: guardResult,
          presentation: null
        }
      });
    }

    res.json({
      success: true,
      data: {
        guardrailResult: guardResult,
        presentation: guardResult.final_output
      }
    });
  } catch (err) {
    console.error("generate error", err);
    res.status(502).json({
      success: false,
      error: "Presentation generation unavailable"
    });
  }
});

export default router;
