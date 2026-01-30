/**
 * STEP 5 安全檢查與輸出鎖定模組 — 共用型別
 * 僅定義檢查結果結構，不包含檢測邏輯、生成或修正。
 * 本模組角色為「只刪不改、只阻擋不修正」的守門員。
 */

import type { GeneratedPresentation } from "./presentation-output";

/** 單一違規項：類型、簡述、位置（不得包含完整違規原文） */
export interface ViolationItem {
  /** 違規類型：顧問語/教學語、結構、角色越權 */
  type: "advisory_or_teaching" | "structure" | "role_overreach";
  /** 違規簡述，供前端顯示；不得洩漏完整違規原文 */
  description: string;
  /** 位置標註，如 slide_2.body、slides.length */
  location: string;
}

/** STEP 5 安全檢查結果 — 通過時帶 final_output，不通過時 final_output 必為 null */
export interface GuardrailResult {
  /** 通過：無違規或違規已刪除且結構正確；不通過：阻擋輸出 */
  status: "pass" | "fail";
  /** 本次檢查發現的所有違規項（含已刪除者亦可記錄） */
  violations: ViolationItem[];
  /**
   * status = pass 時：STEP 4 原始輸出或「刪除違規後」的完整簡報。
   * status = fail 時：必須為 null；未通過的內容不得被下載、複製或顯示為最終簡報。
   */
  final_output: GeneratedPresentation | null;
}
