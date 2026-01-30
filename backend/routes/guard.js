import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadTemplates() {
  const p = join(__dirname, "..", "..", "shared", "templates.json");
  return JSON.parse(readFileSync(p, "utf-8"));
}

function getTemplateById(templateId) {
  const data = loadTemplates();
  const list = Array.isArray(data) ? data : Object.values(data);
  return list.find((t) => t.template_id === templateId) || null;
}

const ADVISORY_WORDS = [
  "建議", "應該", "適合", "策略", "規劃", "最佳",
  "市場趨勢", "行銷價值", "品牌建立"
];

// 強制修正指令：禁止出現在簡報內文／標題的詞彙（業務對老闆講話用語規則）
const BANNED_PHRASES = [
  "功能角色", "本頁", "目前顯示", "有助於", "計畫制定", "後續執行", "顯示出",
  "待確認"  // 缺漏時應使用「這一段我們等下確認」，不得用「待確認」
];

function checkAdvisory(text) {
  const found = [];
  for (const w of ADVISORY_WORDS) {
    if (text && text.includes(w)) found.push(w);
  }
  return found;
}

function checkBannedPhrases(text) {
  const found = [];
  for (const w of BANNED_PHRASES) {
    if (text && text.includes(w)) found.push(w);
  }
  return found;
}

function removeAdvisorySentences(text, violations) {
  if (!text || typeof text !== "string") return text;
  let out = text;
  for (const w of ADVISORY_WORDS) {
    const re = new RegExp(`[^。]*${w}[^。]*。?`, "g");
    const before = out;
    out = out.replace(re, "");
    if (out !== before) violations.push(w);
  }
  return out.trim() || text;
}

export function runGuard(presentation, template) {
  const violations = [];
  const slides = presentation?.slides || [];
  const templateSlides = template?.slides || [];

  if (slides.length !== templateSlides.length) {
    violations.push({
      type: "structure",
      description: `頁數與模板不一致：模板 ${templateSlides.length} 頁，輸出 ${slides.length} 頁`,
      location: "slides.length"
    });
  }

  for (let i = 0; i < templateSlides.length; i++) {
    const ts = templateSlides[i];
    const out = slides[i];
    if (!out || out.slide_number !== ts.slide_number) {
      violations.push({
        type: "structure",
        description: `頁序與模板不一致：第 ${i + 1} 頁`,
        location: `slide_${i + 1}`
      });
    }
  }

  let finalOutput = JSON.parse(JSON.stringify(presentation));
  let hasAdvisory = false;
  let hasRoleOverreach = false;
  let hasBannedPhrase = false;

  for (let i = 0; i < finalOutput.slides.length; i++) {
    const slide = finalOutput.slides[i];
    const tSlide = templateSlides[i];
    if (!tSlide) continue;

    const titleBanned = checkBannedPhrases(slide.title);
    const bodyBanned = checkBannedPhrases(slide.body);
    if (titleBanned.length > 0 || bodyBanned.length > 0) {
      hasBannedPhrase = true;
      for (const w of titleBanned) {
        violations.push({
          type: "banned_phrase",
          description: `禁止用語（業務對老闆講話規則）：${w}`,
          location: `slide_${i + 1}.title`
        });
      }
      for (const w of bodyBanned) {
        violations.push({
          type: "banned_phrase",
          description: `禁止用語（業務對老闆講話規則）：${w}`,
          location: `slide_${i + 1}.body`
        });
      }
    }

    const titleAdvisory = checkAdvisory(slide.title);
    const bodyAdvisory = checkAdvisory(slide.body);
    if (titleAdvisory.length > 0 || bodyAdvisory.length > 0) {
      hasAdvisory = true;
      for (const w of titleAdvisory) {
        violations.push({
          type: "advisory_or_teaching",
          description: `顧問語：${w}`,
          location: `slide_${i + 1}.title`
        });
      }
      for (const w of bodyAdvisory) {
        violations.push({
          type: "advisory_or_teaching",
          description: `顧問語：${w}`,
          location: `slide_${i + 1}.body`
        });
      }
      slide.title = removeAdvisorySentences(slide.title, []);
      slide.body = removeAdvisorySentences(slide.body, []);
    }

    const overreachWords = ["因此最適合", "綜上建議", "此方案最佳", "貴公司適合"];
    for (const w of overreachWords) {
      if ((slide.title && slide.title.includes(w)) || (slide.body && slide.body.includes(w))) {
        hasRoleOverreach = true;
        violations.push({
          type: "role_overreach",
          description: "未在模板中定義的判斷句",
          location: `slide_${i + 1}`
        });
        break;
      }
    }
  }

  const structureFailed = violations.some((v) => v.type === "structure");
  if (structureFailed) {
    return {
      status: "fail",
      violations,
      final_output: null
    };
  }

  if (hasRoleOverreach) {
    return {
      status: "fail",
      violations,
      final_output: null
    };
  }

  if (hasBannedPhrase) {
    return {
      status: "fail",
      violations,
      final_output: null
    };
  }

  return {
    status: "pass",
    violations,
    final_output: hasAdvisory ? finalOutput : presentation
  };
}

const router = Router();

router.post("/", (req, res) => {
  try {
    const { presentation, template_id } = req.body || {};
    if (!presentation || !template_id) {
      return res.status(400).json({
        success: false,
        error: "presentation and template_id are required"
      });
    }
    const template = getTemplateById(template_id);
    if (!template) {
      return res.status(400).json({ success: false, error: "template_id not found" });
    }
    const guardResult = runGuard(presentation, template);
    res.json({ success: true, data: guardResult });
  } catch (err) {
    console.error("guard error", err);
    res.status(502).json({ success: false, error: "Guard service unavailable" });
  }
});

export default router;
