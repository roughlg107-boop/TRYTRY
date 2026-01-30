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

// 缺漏時統一用語（不得使用「待確認」）
const MISSING_PLACEHOLDER = "這一段我們等下確認";

const EXPAND_BODY_SYSTEM = `【給簡報生成的最終規則】你現在的角色是「業務本人，在現場直接對老闆講話」——不是顧問、不是分析師、不是 PM。

語言風格（硬性）：
- 全文必須使用「你／我們」對話語氣。
- 禁止任何第三人稱分析語句。
- 禁止出現以下詞彙或同義語：功能角色、本頁、目前顯示、有助於、計畫制定、後續執行、顯示出。

內容規則：
- 僅使用下方「變數與對應值」中的內容，不得加入策略、建議、推測或原文沒有的資訊。
- 必須遵守「此頁內容規則」。
- 若某變數值為「這一段我們等下確認」（代表缺漏），直接用這句話帶過該點，不得用「待確認」或當作分析結果。
- 語氣假設「老闆就在你面前」：像在聊天，但邏輯清楚。

輸出：純文字，2～4 句，每句完整，總字數約 80～200 字（中文）。僅輸出內文，不要標題、不要項目符號、不要編號。

最終檢查：若這段文字不適合直接照稿念給老闆聽、或唸出來會很尷尬，即不合格，請重寫成可當場說出口的語氣。`;

async function expandSlideBody(slide, extractedClientInfo) {
  const pairs = slide.allowed_variables.map((key) => {
    const val = getValueByPath(extractedClientInfo, key) || MISSING_PLACEHOLDER;
    return `${key}: ${val}`;
  });
  const openai = getOpenAIClient();
  const userContent = `此頁用途：${slide.function_role}
此頁內容規則：${slide.content_rules}

變數與對應值：
${pairs.join("\n")}

請依上述規則，將以上資料擴寫成 2～4 句簡報內文（僅輸出內文）。缺漏處用「這一段我們等下確認」帶過，禁止使用「待確認」。`;

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
  return parts.length > 0 ? parts.join("。") : MISSING_PLACEHOLDER;
}

export async function fillPresentation(template, extractedClientInfo) {
  const slides = [];
  for (const slide of template.slides) {
    const placeholders = [];
    for (const key of slide.allowed_variables) {
      const val = getValueByPath(extractedClientInfo, key);
      placeholders.push(val || MISSING_PLACEHOLDER);
    }
    let title = slide.title_pattern;
    let idx = 0;
    while (title.includes("___") && idx < placeholders.length) {
      title = title.replace("___", placeholders[idx] || MISSING_PLACEHOLDER);
      idx++;
    }
    while (title.includes("___")) title = title.replace("___", MISSING_PLACEHOLDER);

    let body;
    if (slide.slide_number === 1) {
      const bodyParts = slide.allowed_variables
        .map((key) => getValueByPath(extractedClientInfo, key))
        .filter(Boolean);
      body = bodyParts.length > 0 ? bodyParts.join("\n") : MISSING_PLACEHOLDER;
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
