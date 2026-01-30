import { Router } from "express";
import { extractVisitReport } from "../services/openai.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { rawReport } = req.body || {};
    if (!rawReport || typeof rawReport !== "string" || !rawReport.trim()) {
      return res.status(400).json({
        success: false,
        error: "rawReport is required and must be non-empty"
      });
    }
    const data = await extractVisitReport(rawReport.trim());
    res.json({ success: true, data });
  } catch (err) {
    console.error("extract error", err);
    res.status(502).json({
      success: false,
      error: "Extraction service unavailable"
    });
  }
});

export default router;
