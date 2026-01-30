/**
 * STEP 4 簡報填空生成模組 — API 共用型別
 * 僅定義請求/回應結構，不包含填空邏輯、審稿或優化。
 * 本模組角色為「依母模板填入內容的排版員」，不新增/刪除/調整頁面。
 */

import type { ExtractedClientInfo } from "./extraction";

/** 單頁產出：標題與內文為可直接貼入 PPT 的純文字 */
export interface GeneratedSlideOutput {
  slide_number: number;
  title: string;
  body: string;
}

/** 填空產出的完整簡報（固定頁數、頁序，與母模板一致） */
export interface GeneratedPresentation {
  template_id: string;
  slides: GeneratedSlideOutput[];
}

/** 簡報填空生成 API 的 Request Body */
export interface GeneratePresentationRequest {
  /** 使用者於 STEP 3 手動選定的範本 ID，必填 */
  template_id: string;
  /** STEP 1 產出的客戶資訊，必填 */
  extractedClientInfo: ExtractedClientInfo;
  /** 專案/案件識別，可選 */
  projectId?: string;
}

/** 簡報填空生成 API 成功回應 */
export interface GeneratePresentationSuccessResponse {
  success: true;
  data: GeneratedPresentation;
  requestId?: string;
}

/** 簡報填空生成 API 錯誤回應 */
export interface GeneratePresentationErrorResponse {
  success: false;
  error: string;
}

export type GeneratePresentationResponse =
  | GeneratePresentationSuccessResponse
  | GeneratePresentationErrorResponse;
