/**
 * STEP 2 簡報範本（母模板）系統 — 共用型別
 * 僅定義範本與單頁結構，不包含 AI 或簡報生成邏輯。
 * 範本不可由 AI 修改、合併、拆分或調整順序。
 */

/** 單一投影片骨架（固定頁序、功能角色、標題句型、內容規則、可填入變數） */
export interface PresentationSlideSkeleton {
  /** 頁序（從 1 起） */
  slide_number: number;
  /** 此頁功能角色，如：共識建立 / 風險定位 / 差異對照 / 選項收斂 / 確認 */
  function_role: string;
  /** 固定句型結構，如：「不是 ___ ，而是 ___」 */
  title_pattern: string;
  /** 此頁不能寫什麼，如：不可說服、不可講方案 */
  content_rules: string;
  /** 僅允許被填入的欄位 key，來自 STEP 1 ExtractedClientInfo（dot 路徑） */
  allowed_variables: string[];
}

/** 簡報範本（母模板）— 固定頁數、頁序、每頁功能角色，不可由 AI 修改 */
export interface PresentationTemplate {
  /** 唯一識別碼 */
  template_id: string;
  /** 顯示用名稱 */
  template_name: string;
  /** 此範本適用情境說明 */
  intended_usage: string;
  /** 滿足任一條即不可使用此範本；條目為可判斷的條件描述 */
  absolute_exclusion_conditions: string[];
  /** 固定頁數、固定順序的投影片骨架 */
  slides: PresentationSlideSkeleton[];
}

/** 系統預設範本 ID（與 docs/02 中三份 JSON 一致） */
export type TemplateId = "stable_close" | "conservative_trial" | "fast_forward";

/** 範本建議清單中單一候選（供 API 回傳給前端，由使用者點選） */
export interface TemplateSuggestionItem {
  template_id: TemplateId;
  template_name: string;
  intended_usage: string;
}
