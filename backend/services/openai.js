import OpenAI from "openai";

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("OPENAI_API_KEY environment variable is missing or empty. Set it in Render Dashboard → Environment.");
  }
  return new OpenAI({ apiKey: key });
}

const EXTRACT_SYSTEM = `你是一個「客戶資訊抽取員」。你只能做三件事：
1. 從「第一次拜訪報告」中擷取「明確寫出或可直接轉寫」的資訊
2. 將資訊分類進固定 JSON 欄位
3. 標註缺漏（未出現的欄位填空字串，缺漏項列於 missing_information 陣列)

禁止：判斷策略、推薦範本、推測心理、使用「可能/推測/建議/適合」、補齊原文沒有的資訊。
輸出「僅能」是單一 JSON 物件，不要任何 Markdown 或說明。`;

const EXTRACT_USER_PREFIX = `請從以下拜訪報告中抽取資訊，輸出「僅」以下 JSON 結構（未提及欄位填 ""，缺漏項列在 missing_information）：
{
  "company_profile": { "company_name": "", "industry": "", "business_type": "", "company_size": "", "location": "" },
  "decision_makers": { "primary_decision_maker": "", "other_influencers": "", "decision_style_notes": "" },
  "current_marketing_status": { "existing_channels": "", "short_video_experience": "", "current_problems_mentioned": "" },
  "constraints_and_concerns": { "budget_mentions": "", "time_or_resource_limits": "", "explicit_concerns": "" },
  "explicit_goals": { "stated_goals": "", "timeframe_mentions": "" },
  "missing_information": []
}

拜訪報告：
`;

export async function extractVisitReport(rawReport) {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: EXTRACT_USER_PREFIX + rawReport }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return JSON.parse(content);
}

export function getValueByPath(obj, path) {
  const keys = path.split(".");
  let v = obj;
  for (const k of keys) {
    v = v?.[k];
    if (v === undefined) return "";
  }
  return typeof v === "string" ? v : (v ? String(v) : "");
}

const EXPAND_BODY_SYSTEM = `你是「簡報內文擴寫員」。你只能做一件事：將「已提供的客戶資料」擴寫成 2～4 句可讀的簡報內文。
規則：
1. 僅使用下方「變數與對應值」中的內容，不得加入策略、建議、推測或原文沒有的資訊。
2. 必須遵守「本頁內容規則」。
3. 禁止使用「可能、建議、適合、應該、最佳」等語。
4. 輸出純文字，2～4 句，每句完整，總字數約 80～200 字（中文）。若資料為「（待確認）」可一筆帶過，仍須保持語句通順。`;

async function expandSlideBody(slide, extractedClientInfo) {
  const pairs = slide.allowed_variables.map((key) => {
    const val = getValueByPath(extractedClientInfo, key) || "（待確認）";
    return `${key}: ${val}`;
  });
  const openai = getOpenAIClient();
  const userContent = `本頁功能角色：${slide.function_role}
本頁內容規則：${slide.content_rules}

變數與對應值：
${pairs.join("\n")}

請依上述規則，將以上資料擴寫成 2～4 句簡報內文（僅輸出內文，不要標題、不要項目符號、不要編號）。`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EXPAND_BODY_SYSTEM },
      { role: "user", content: userContent }
    ],
    temperature: 0.3,
    max_tokens: 400
  });
  const text = response.choices[0]?.message?.content?.trim();
  return text || fallbackBody(slide, extractedClientInfo);
}

function fallbackBody(slide, extractedClientInfo) {
  const parts = slide.allowed_variables
    .map((key) => getValueByPath(extractedClientInfo, key))
    .filter(Boolean);
  return parts.length > 0 ? parts.join("。") : "（待確認）";
}

export async function fillPresentation(template, extractedClientInfo) {
  const slides = [];
  for (const slide of template.slides) {
    const placeholders = [];
    for (const key of slide.allowed_variables) {
      const val = getValueByPath(extractedClientInfo, key);
      placeholders.push(val || "（待確認）");
    }
    let title = slide.title_pattern;
    let idx = 0;
    while (title.includes("___") && idx < placeholders.length) {
      title = title.replace("___", placeholders[idx] || "（待確認）");
      idx++;
    }
    while (title.includes("___")) title = title.replace("___", "（待確認）");

    let body;
    if (slide.slide_number === 1) {
      const bodyParts = slide.allowed_variables
        .map((key) => getValueByPath(extractedClientInfo, key))
        .filter(Boolean);
      body = bodyParts.length > 0 ? bodyParts.join("\n") : "（待確認）";
    } else {
      try {
        body = await expandSlideBody(slide, extractedClientInfo);
      } catch (err) {
        console.warn("expandSlideBody failed, using fallback:", err.message);
        body = fallbackBody(slide, extractedClientInfo);
      }
    }

    slides.push({
      slide_number: slide.slide_number,
      title,
      body
    });
  }
  return { template_id: template.template_id, slides };
}
