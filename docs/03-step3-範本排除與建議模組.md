# STEP 3：簡報範本排除與建議模組

> 本模組定位為「**協助使用者縮小選項，而非替使用者做決策**」。系統必須要求使用者**手動選擇一個範本**才能進入下一步；不得自動帶入第一個範本、不得有預設選項。

---

## 一、模組核心任務（不可偏離）

根據 **STEP 1 產出的「客戶資訊 JSON」**（`ExtractedClientInfo`）以及 **STEP 2 已定義的「簡報母模板 JSON」**（各範本的 `absolute_exclusion_conditions`），**排除「明顯不適合」的範本**，並將未被排除的範本列為**可選清單（2～3 個）**，供使用者點選。最終選擇權**一定在使用者**。

---

## 二、AI 在此模組中「只允許做的事」

| 允許行為 | 說明 |
|----------|------|
| **檢查排除條件** | 對每一個範本檢查其 `absolute_exclusion_conditions`。 |
| **對照客戶資訊** | 以 STEP 1 的 `ExtractedClientInfo` 中「明確存在的資訊」對照條件，判斷是否觸發排除。 |
| **列出被排除範本與原因** | 將被排除的範本列於 `excluded_templates`，並說明「被排除原因（對應觸發的條件）」。 |
| **列出可選清單** | 將未被排除的範本列於 `available_templates`，並以 `why_not_excluded` 僅描述「未觸發排除條件」，不得使用「適合、建議、最佳」等語言。 |

---

## 三、AI 在此模組中「嚴格禁止的行為」

| 禁止行為 | 說明 |
|----------|------|
| ❌ 判斷「哪一個最好」 | 不產出任何排序或優劣結論。 |
| ❌ 判斷「哪一個最適合」 | 不推薦單一範本。 |
| ❌ 幫使用者做最終選擇 | 最終選擇一定由使用者在前端點選。 |
| ❌ 改寫、調整、混合範本內容 | 不修改範本結構或條件。 |
| ❌ 依個人推論新增排除條件 | 僅能使用範本中已寫明的 `absolute_exclusion_conditions`。 |

---

## 四、排除判斷規則（必須明確）

| 只能依據 | 不得使用 |
|----------|----------|
| STEP 1 JSON 中**明確存在的資訊**（`ExtractedClientInfo` 各欄位內容） | 推測 |
| 範本中已寫明的 **`absolute_exclusion_conditions`**（一字不增不減，僅做「是否被客戶資訊觸發」的比對） | 心理判斷 |
| — | 經驗補充、成交話術、策略推論 |

- **觸發邏輯**：若客戶資訊（或報告原文若一併傳入）中**明確寫出**的內容，與某條 `absolute_exclusion_conditions` 描述的事實相符，則該範本被排除，並在 `reason` 中引用該條件。  
- **不觸發**：若客戶資訊未明確提及、或提及內容與條件不符，則該範本**不**被排除，列入 `available_templates`，`why_not_excluded` 僅能描述「未觸發任一條排除條件」，不得使用「適合、建議、最佳」等語。

---

## 五、輸出格式（固定）

AI 必須輸出以下 **單一 JSON 結構**，不得在 JSON 外輸出說明或建議。

```json
{
  "excluded_templates": [
    {
      "template_id": "",
      "reason": ""
    }
  ],
  "available_templates": [
    {
      "template_id": "",
      "template_name": "",
      "why_not_excluded": ""
    }
  ]
}
```

| 區塊 | 欄位 | 型別 | 說明 |
|------|------|------|------|
| `excluded_templates` | `template_id` | `string` | 被排除的範本 ID（與 STEP 2 的 `template_id` 一致）。 |
| | `reason` | `string` | 被排除原因，須對應範本中**某一條** `absolute_exclusion_conditions` 的原文或簡短引用，不得自行發揮。 |
| `available_templates` | `template_id` | `string` | 未被排除的範本 ID。 |
| | `template_name` | `string` | 顯示用名稱（與 STEP 2 一致）。 |
| | `why_not_excluded` | `string` | **僅能**描述「未觸發排除條件」；**不得**使用「適合、建議、最佳、推薦」等語言。 |

- `available_templates` 應為 **2～3 個**（當僅剩 1 個或 0 個時，仍如實回傳，不補齊、不刪減）。  
- 不得在 JSON 之外輸出任何說明文字。

---

## 六、系統互動規則（非常重要）

| 規則 | 說明 |
|------|------|
| **必須手動選擇** | 系統必須要求使用者在可選清單中**手動點選一個範本**，才能進入下一步（STEP 4 最終簡報產出）。 |
| **不得自動帶入** | 不得將「第一個範本」或任一範本自動設為已選。 |
| **不得有預設選項** | 前端不得預勾選、預選任何範本；使用者未點選前，「產出簡報」按鈕應不可用或不明顯。 |
| **選擇結果** | 使用者點選後，前端將選定的 `template_id` 傳給 STEP 4 API，作為「依此範本填空」的唯一依據。 |

---

## 七、API Endpoint 規劃

### 7.1 基本資訊

| 項目 | 說明 |
|------|------|
| **Method** | `POST` |
| **Path** | `/api/v1/suggest-templates` |
| **Content-Type** | `application/json` |
| **認證** | 依整體系統設計，可於 Header 帶入 Firebase ID Token；本文件不實作驗證邏輯。 |

### 7.2 Request 結構（Input）

**Body（JSON）**

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `extractedClientInfo` | `ExtractedClientInfo` | 是 | STEP 1 產出的客戶資訊 JSON，完整物件（含 `company_profile`、`decision_makers`、…、`missing_information`）。 |
| `projectId` | `string` | 否 | 專案/案件識別，供後端寫入 Firestore 或日誌；非必填。 |
| `pastPresentationStructure` | `object` 或省略 | 否 | 若使用者有執行 STEP 2 可選步驟（上傳過往簡報），可帶入結構解析結果；本模組**僅可**用於輔助排除判斷（例如：若未來定義「與過往簡報頁數差異過大則排除」），**不可**用於推薦「哪一個最好」。若無則不傳或傳 `null`。 |

**範例**

```json
{
  "extractedClientInfo": {
    "company_profile": { "company_name": "XX 科技", "industry": "零售", "..." },
    "decision_makers": { "..." },
    "current_marketing_status": { "..." },
    "constraints_and_concerns": { "budget_mentions": "預算極度有限", "..." },
    "explicit_goals": { "..." },
    "missing_information": []
  },
  "projectId": "optional-project-id"
}
```

### 7.3 Response 結構（Output）

**成功（HTTP 200）**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `success` | `boolean` | 固定為 `true`。 |
| `data` | `TemplateSuggestionResult` | 即第五節之 JSON：`excluded_templates` + `available_templates`。 |
| `requestId` | `string` | 可選，供除錯或日誌追蹤。 |

**`data` 型別**

```ts
interface TemplateSuggestionResult {
  excluded_templates: Array<{ template_id: string; reason: string }>;
  available_templates: Array<{
    template_id: string;
    template_name: string;
    why_not_excluded: string;
  }>;
}
```

**錯誤（4xx / 5xx）**

| 情境 | HTTP | Body 建議 |
|------|------|-----------|
| 缺少 `extractedClientInfo` 或結構不完整 | 400 | `{ "success": false, "error": "extractedClientInfo is required" }` |
| 認證失敗 | 401 | `{ "success": false, "error": "Unauthorized" }` |
| AI 或範本載入失敗 | 502 / 503 | `{ "success": false, "error": "Template suggestion service unavailable" }` |

---

## 八、與 STEP 1、STEP 2 的資料串接說明

### 8.1 與 STEP 1 的串接

| 項目 | 說明 |
|------|------|
| **輸入來源** | 本 API 的 **唯一必要輸入**為 STEP 1 的輸出：`ExtractedClientInfo`。前端在步驟 1 完成後取得此 JSON，於步驟 3 呼叫本 API 時整份傳入 `extractedClientInfo`。 |
| **使用方式** | 後端（或 AI）僅能依 `ExtractedClientInfo` 內**明確存在的欄位值**與各範本的 `absolute_exclusion_conditions` 做比對，判斷是否觸發排除。不得使用 STEP 1 未產出的欄位或自行推論。 |
| **不覆寫** | 本模組**不修改、不覆寫** STEP 1 的輸出；僅讀取後用於排除判斷，並將「可選範本清單」回傳給前端。 |

### 8.2 與 STEP 2 的串接

| 項目 | 說明 |
|------|------|
| **範本來源** | 本模組讀取 STEP 2 已定義的**簡報母模板**（三份 JSON：`stable_close`、`conservative_trial`、`fast_forward`），取得每個範本的 `template_id`、`template_name`、`absolute_exclusion_conditions`。 |
| **僅讀取** | 不修改、不調整、不混合範本內容；僅依 `absolute_exclusion_conditions` 與 STEP 1 的客戶資訊做排除判斷。 |
| **輸出對齊** | 回傳的 `template_id` 必須與 STEP 2 定義一致，以便使用者在步驟 4 選定後，後端能以該 `template_id` 載入對應範本進行填空。 |

### 8.3 資料流簡圖

```
[STEP 1] POST /api/v1/extract-visit-report
         → 前端取得 ExtractedClientInfo
                    ↓
[前端] 步驟 3：使用者點「取得範本建議」
         → POST /api/v1/suggest-templates { extractedClientInfo }
                    ↓
[後端・本模組] 載入 STEP 2 範本（唯讀）
         → 對每個範本檢查 absolute_exclusion_conditions
         → 對照 ExtractedClientInfo 明確資訊，判斷觸發與否
         → 產出 excluded_templates + available_templates（固定 JSON）
                    ↓
[前端] 顯示 available_templates，要求使用者「手動選擇一個」
         → 使用者點選 → 記住 template_id
                    ↓
[STEP 4] 使用者點「產出簡報」時，以 template_id + ExtractedClientInfo 呼叫最終簡報 API
```

---

## 九、設計邊界確認（本步驟未含內容）

- ❌ 未設計簡報內容生成。  
- ❌ 未加入任何成交話術。  
- ✅ 已完成：模組功能說明、API endpoint 規劃（input / output JSON）、與 STEP 1 / STEP 2 的資料串接說明、系統互動規則（手動選擇、無預設）。

完成後停止，等待下一步指示。
