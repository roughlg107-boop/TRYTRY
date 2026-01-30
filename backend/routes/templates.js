import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let templatesCache = null;

function loadTemplates() {
  if (templatesCache) return templatesCache;
  const path = join(__dirname, "..", "..", "shared", "templates.json");
  const raw = readFileSync(path, "utf-8");
  templatesCache = JSON.parse(raw);
  return templatesCache;
}

const router = Router();

router.get("/", (req, res) => {
  try {
    const data = loadTemplates();
    res.json({ success: true, data });
  } catch (err) {
    console.error("templates error", err);
    res.status(500).json({ success: false, error: "Failed to load templates" });
  }
});

export default router;
