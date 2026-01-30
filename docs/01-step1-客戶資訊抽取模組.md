# STEP 1：第一次拜訪報告 → 客戶資訊抽取模組

> 本模組為系統中**唯一允許 AI 理解文字內容**的模組，但**嚴格禁止**AI 進行任何判斷、建議或策略推論。

---

## 一、模組目的（不可偏離）

將使用者輸入的「**第一次拜訪報告（自然語言）**」轉換為**結構化、可填空使用的客戶資料 JSON**，供後續步驟（範本建議、最終簡報產出）使用。此模組輸出為後續所有步驟的**唯一客戶資料來源**，不可被後續步驟覆寫。

---

## 二、AI 在此模組中「只允許做的事」

| 允許行為 | 說明 |
|----------|------|
| **擷取明確資訊** | 僅擷取報告中「明確寫出」或「可直接轉寫」的資訊，不推測、不補齊。 |
| **分類進固定欄位** | 將擷取到的資訊對應至既定的 JSON 欄位結構。 |
| **標註缺漏** | 標註哪些欄位「資料不足或未出現」，並將缺漏項集中列於 `missing_information` 陣列。 |

---

## 三、AI 在此模組中「嚴格禁止的行為」

| 禁止行為 | 說明 |
|----------|------|
| ❌ 判斷客戶適合什麼策略 | 不產出任何策略結論。 |
| ❌ 判斷應該使用哪一種簡報 | 不推薦或暗示範本類型。 |
| ❌ 推測客戶心理或動機 | 不從文字推論意圖、偏好或動機。 |
| ❌ 使用推測性語言 | 禁止使用「可能、推測、建議、適合」等用語。 |
| ❌ 補齊不存在於原文的資訊 | 未提及的欄位一律填空字串，不得臆測填寫。 |

---

## 四、輸出格式（固定，不得自由發揮）

AI 必須輸出**單一 JSON 物件**，結構如下。若原文未提及某欄位，該欄位填入空字串 `""`；缺漏資訊條列於 `missing_information` 陣列；**不得在 JSON 之外輸出任何說明、註解或 Markdown 包裝**。

```json
{
  "company_profile": {
    "company_name": "",
    "industry": "",
    "business_type": "",
    "company_size": "",
    "location": ""
  },
  "decision_makers": {
    "primary_decision_maker": "",
    "other_influencers": "",
    "decision_style_notes": ""
  },
  "current_marketing_status": {
    "existing_channels": "",
    "short_video_experience": "",
    "current_problems_mentioned": ""
  },
  "constraints_and_concerns": {
    "budget_mentions": "",
    "time_or_resource_limits": "",
    "explicit_concerns": ""
  },
  "explicit_goals": {
    "stated_goals": "",
    "timeframe_mentions": ""
  },
  "missing_information": [
    ""
  ]
}
```

- **空欄位**：原文未提及 → 使用 `""`。  
- **缺漏說明**：例如「報告中未提及預算」→ 在 `missing_information` 新增一筆描述字串。  
- **輸出純度**：回應 body 僅能為上述 JSON，無前後贅文。

---

## 五、系統層設計

- 本模組為**獨立後端 API**，由 backend 實作與部署。  
- **前端職責**：送出「原始拜訪報告文字」、接收並展示回傳的 JSON；不解析、不改寫、不覆寫此結果。  
- **後續步驟**：範本建議、最終簡報產出等，皆以本模組輸出的 JSON 為客戶資料來源，**不可覆寫或重新產出**此結構化結果。

---

## 六、API Endpoint 規劃

### 6.1 基本資訊

| 項目 | 說明 |
|------|------|
| **Method** | `POST` |
| **Path** | `/api/v1/extract-visit-report` |
| **Content-Type** | `application/json` |
| **認證** | 依整體系統設計，可於 Header 帶入 Firebase ID Token（如 `Authorization: Bearer <token>`），由後端驗證；本文件不實作驗證邏輯。 |

### 6.2 Request 結構

**Body（JSON）**

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `rawReport` | `string` | 是 | 使用者輸入的第一次拜訪報告全文（自然語言）。 |
| `projectId` | `string` | 否 | 若系統有專案/案件識別，可帶入以便後端寫入 Firestore；非必填時後端仍可正常完成抽取。 |

**範例**

```json
{
  "rawReport": "本次拜訪對象為 XX 科技，主要決策者為行銷經理王先生…",
  "projectId": "optional-project-id"
}
```

### 6.3 Response 結構

**成功（HTTP 200）**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `success` | `boolean` | 固定為 `true`。 |
| `data` | `ExtractedClientInfo` | 即第四節定義之完整 JSON 物件（含 `company_profile`、`decision_makers`、…、`missing_information`）。 |
| `requestId` | `string` | 可選，供除錯或日誌追蹤用。 |

**`data` 型別（與第四節輸出格式一致）**

```ts
// 僅作結構說明，實際以 JSON 為準
interface ExtractedClientInfo {
  company_profile: {
    company_name: string;
    industry: string;
    business_type: string;
    company_size: string;
    location: string;
  };
  decision_makers: {
    primary_decision_maker: string;
    other_influencers: string;
    decision_style_notes: string;
  };
  current_marketing_status: {
    existing_channels: string;
    short_video_experience: string;
    current_problems_mentioned: string;
  };
  constraints_and_concerns: {
    budget_mentions: string;
    time_or_resource_limits: string;
    explicit_concerns: string;
  };
  explicit_goals: {
    stated_goals: string;
    timeframe_mentions: string;
  };
  missing_information: string[];
}
```

**錯誤（4xx / 5xx）**

| 情境 | HTTP | Body 建議 |
|------|------|-----------|
| 缺少 `rawReport` 或為空字串 | 400 | `{ "success": false, "error": "rawReport is required and must be non-empty" }` |
| 內容過長（依後端限制） | 400 | `{ "success": false, "error": "rawReport exceeds maximum length" }` |
| 認證失敗 | 401 | `{ "success": false, "error": "Unauthorized" }` |
| AI 呼叫失敗或逾時 | 502 / 503 | `{ "success": false, "error": "Extraction service unavailable" }` |

---

## 七、此模組在整體系統中的位置

```
[使用者] 輸入第一次拜訪報告（自然語言）
        ↓
[前端] 驗證格式/長度 → POST /api/v1/extract-visit-report { rawReport }
        ↓
[後端・本模組] 拜訪報告處理 / 客戶資訊抽取
        → 僅做：擷取明確資訊、分類至固定欄位、標註缺漏
        → 禁止：策略、範本建議、推測、補齊
        ↓
[後端] 回傳 ExtractedClientInfo JSON
        ↓
[前端] 展示結構化結果與 missing_information，供使用者檢視/補齊
        ↓
[後續步驟] 步驟 2（可選）、步驟 3（範本建議）、步驟 4（最終簡報產出）
           皆以本模組輸出的 ExtractedClientInfo 為「客戶資料」唯一來源，不覆寫。
```

- **上游**：前端（僅負責送原始文字、收 JSON）。  
- **下游**：範本建議 API、最終簡報產出 API（讀取本模組輸出，不修改）。  
- **與其他模組邊界**：本模組不涉及「簡報生成」「策略分析」「範本選擇」；僅產出結構化客戶資料。

---

## 八、設計邊界確認（本步驟未含內容）

- ❌ 不設計簡報生成、策略分析、範本選擇。  
- ❌ 不實作 AI prompt、JSON schema 驗證或呼叫邏輯（留待實作階段）。  
- ✅ 僅完成：模組功能說明、API endpoint 規劃（request/response 結構）、系統位置說明。

完成後停止，等待下一步指示。
