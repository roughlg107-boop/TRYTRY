/**
 * STEP 1 客戶資訊抽取模組 — 共用型別
 * 僅定義 API 請求/回應結構，不包含任何商業邏輯或 AI 呼叫。
 */

/** 抽取 API 的 Request Body */
export interface ExtractVisitReportRequest {
  /** 第一次拜訪報告全文（自然語言），必填 */
  rawReport: string;
  /** 專案/案件識別，可選，供後端寫入 Firestore 等 */
  projectId?: string;
}

/** 公司基本資料（對應 AI 輸出之 company_profile） */
export interface CompanyProfile {
  company_name: string;
  industry: string;
  business_type: string;
  company_size: string;
  location: string;
}

/** 決策者相關（對應 AI 輸出之 decision_makers） */
export interface DecisionMakers {
  primary_decision_maker: string;
  other_influencers: string;
  decision_style_notes: string;
}

/** 現有行銷狀態（對應 AI 輸出之 current_marketing_status） */
export interface CurrentMarketingStatus {
  existing_channels: string;
  short_video_experience: string;
  current_problems_mentioned: string;
}

/** 限制與顧慮（對應 AI 輸出之 constraints_and_concerns） */
export interface ConstraintsAndConcerns {
  budget_mentions: string;
  time_or_resource_limits: string;
  explicit_concerns: string;
}

/** 明確目標（對應 AI 輸出之 explicit_goals） */
export interface ExplicitGoals {
  stated_goals: string;
  timeframe_mentions: string;
}

/** 抽取結果 — 與 API 及 AI 輸出格式一致，後續步驟唯讀使用 */
export interface ExtractedClientInfo {
  company_profile: CompanyProfile;
  decision_makers: DecisionMakers;
  current_marketing_status: CurrentMarketingStatus;
  constraints_and_concerns: ConstraintsAndConcerns;
  explicit_goals: ExplicitGoals;
  missing_information: string[];
}

/** 抽取 API 成功回應 */
export interface ExtractVisitReportSuccessResponse {
  success: true;
  data: ExtractedClientInfo;
  requestId?: string;
}

/** 抽取 API 錯誤回應 */
export interface ExtractVisitReportErrorResponse {
  success: false;
  error: string;
}

export type ExtractVisitReportResponse =
  | ExtractVisitReportSuccessResponse
  | ExtractVisitReportErrorResponse;
