/**
 * STEP 3 範本排除與建議模組 — API 共用型別
 * 僅定義請求/回應結構，不包含排除邏輯或 AI 呼叫。
 * 最終範本選擇一定由使用者手動點選，本 API 不產出「建議選哪一個」。
 */

import type { ExtractedClientInfo } from "./extraction";

/** 被排除的範本：ID + 對應的排除原因（須對應範本中某一條 absolute_exclusion_conditions） */
export interface ExcludedTemplateItem {
  template_id: string;
  reason: string;
}

/** 可選範本：ID + 顯示名稱 + 未觸發排除之說明（不得使用「適合、建議、最佳」） */
export interface AvailableTemplateItem {
  template_id: string;
  template_name: string;
  why_not_excluded: string;
}

/** 範本建議 API 的完整結果（AI 輸出固定為此結構） */
export interface TemplateSuggestionResult {
  excluded_templates: ExcludedTemplateItem[];
  available_templates: AvailableTemplateItem[];
}

/** 範本建議 API 的 Request Body */
export interface SuggestTemplatesRequest {
  /** STEP 1 產出的客戶資訊，必填 */
  extractedClientInfo: ExtractedClientInfo;
  /** 專案/案件識別，可選 */
  projectId?: string;
  /** 可選：STEP 2 過往簡報結構解析結果，僅供排除判斷輔助，不可用於推薦「哪一個最好」 */
  pastPresentationStructure?: unknown;
}

/** 範本建議 API 成功回應 */
export interface SuggestTemplatesSuccessResponse {
  success: true;
  data: TemplateSuggestionResult;
  requestId?: string;
}

/** 範本建議 API 錯誤回應 */
export interface SuggestTemplatesErrorResponse {
  success: false;
  error: string;
}

export type SuggestTemplatesResponse =
  | SuggestTemplatesSuccessResponse
  | SuggestTemplatesErrorResponse;
