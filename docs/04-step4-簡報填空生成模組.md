# STEP 4：簡報填空生成模組（Template-Fill Generator）

> 本模組的角色**不是寫作者、不是顧問**，而是「**依母模板填入內容的排版員**」。僅在既定句型中填入允許的變數，不新增/刪除/調整頁面、不改寫句型、不補充說明或建議。

---

## 一、模組唯一任務（不可偏離）

根據以下兩項輸入：

1. **STEP 1 的「客戶資訊 JSON」**（`ExtractedClientInfo`）  
2. **使用者於 STEP 3 手動選定的「單一簡報母模板」**（以 `template_id` 識別，對應 STEP 2 定義的範本 JSON）

產出一份**可直接貼入 PPT 的完整簡報文字內容**：固定頁數、固定頁序、每頁標題與內文皆依母模板的 `title_pattern` 與 `allowed_variables` 填入，**不得自由發揮**。

---

## 二、生成的絕對限制（非常重要）

| AI 在此模組中**不得** | AI **只能**做一件事 |
|----------------------|----------------------|
| ❌ 新增頁面 | 👉 **在既定句型中，填入允許的變數。** |
| ❌ 刪除頁面 | |
| ❌ 調整頁面順序 | |
| ❌ 改寫 `title_pattern` | |
| ❌ 補充說明性文字 | |
| ❌ 加入建議、分析、顧問語句 | |

- 標題必須**完全遵循**母模板該頁的 `title_pattern`，僅將 `___` 等佔位處替換為 `allowed_variables` 對應的客戶資訊（或「（待確認）」）。  
- 內文（`body`）僅能使用該頁 `allowed_variables` 所列欄位的資料，**不得**加入未在範本中定義的說明、建議或分析。

---

## 三、單頁生成規則（嚴格執行）

對於**每一頁（slide）**：

| 規則 | 說明 |
|------|------|
| **標題** | 必須完全遵循該頁的 `title_pattern`；僅替換佔位處為對應變數值或「（待確認）」。 |
| **內容** | 只能使用該頁 `allowed_variables` 中的資料；若某變數在 STEP 1 中為空或屬缺漏，以「（待確認）」標註，**不得**臆測填寫。 |
| **頁數與順序** | 不得因資料不足而**跳過**或**合併**頁面；母模板有幾頁就產出幾頁，順序與 `slide_number` 一致。 |
| **句型** | 不改寫句型結構；僅做「變數代入」，必要時保留句型並在缺漏處標「（待確認）」。 |

---

## 四、輸出格式（固定）

本模組輸出必須為以下 **單一 JSON 結構**，不得在 JSON 外附加說明或 Markdown。

```json
{
  "template_id": "",
  "slides": [
    {
      "slide_number": 1,
      "title": "",
      "body": ""
    }
  ]
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `template_id` | `string` | 使用者選定的範本 ID，與 STEP 2 定義一致。 |
| `slides` | `SlideOutput[]` | 與母模板**頁數、頁序一致**的投影片陣列。 |
| `slides[].slide_number` | `number` | 頁序（從 1 起），與母模板一致。 |
| `slides[].title` | `string` | 依該頁 `title_pattern` 填入變數後的標題；**可直接貼入 PPT**。 |
| `slides[].body` | `string` | 該頁內文，**可直接貼入 PPT 的純文字**；不需 Markdown、不需任何說明文字。 |

- **body**：純文字，無 Markdown 語法、無註解、無「建議」「分析」等額外句子。  
- 不得在 JSON 之外輸出任何說明文字。

---

## 五、資料缺漏處理規則

| 情境 | 處理方式 |
|------|----------|
| STEP 1 某欄位為空字串或標示於 `missing_information` | 該欄位在填空時以「**（待確認）**」顯示；**仍須生成該頁**，不得跳過或合併。 |
| 禁止 AI 補齊或推測 | 不得依「可能」「推測」「一般來說」等補齊缺漏；僅能填入 STEP 1 中**明確存在**的內容，或「（待確認）」。 |

- 若整頁所需變數皆缺漏，該頁標題與內文仍依 `title_pattern` 與句型產出，缺漏處一律「（待確認）」。  
- **禁止**因資料不足而刪除頁面、改寫句型為「本頁暫無資料」等說明性文字（僅允許在佔位處寫「（待確認）」）。

---

## 六、系統層要求

| 項目 | 說明 |
|------|------|
| **獨立 API** | 本模組為獨立後端 API，與 STEP 1 / STEP 3 分離；僅負責「依選定範本 + 客戶資訊填空」並回傳固定 JSON。 |
| **僅在選定範本後呼叫** | 僅在「使用者已於 STEP 3 手動選定一個範本」後才可呼叫；前端必須傳入該 `template_id` 與 STEP 1 的 `ExtractedClientInfo`。 |
| **不得被繞過** | 前端或其他模組不得繞過「使用者手動選擇範本」而直接傳入任意 `template_id` 呼叫；後端可選擇驗證 `template_id` 是否為 STEP 3 回傳之 `available_templates` 中的一員（依專案實作決定）。 |

---

## 七、API Endpoint 規劃

### 7.1 基本資訊

| 項目 | 說明 |
|------|------|
| **Method** | `POST` |
| **Path** | `/api/v1/generate-presentation` |
| **Content-Type** | `application/json` |
| **認證** | 依整體系統設計，可於 Header 帶入 Firebase ID Token；本文件不實作驗證邏輯。 |

### 7.2 Request 結構

**Body（JSON）**

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `template_id` | `string` | 是 | 使用者於 STEP 3 **手動選定**的範本 ID，必須與 STEP 2 定義一致（如 `stable_close`、`conservative_trial`、`fast_forward`）。 |
| `extractedClientInfo` | `ExtractedClientInfo` | 是 | STEP 1 產出的客戶資訊 JSON，完整物件。 |
| `projectId` | `string` | 否 | 專案/案件識別，供後端寫入 Firestore 或日誌；非必填。 |

**範例**

```json
{
  "template_id": "stable_close",
  "extractedClientInfo": {
    "company_profile": { "company_name": "XX 科技", "..." },
    "decision_makers": { "..." },
    "current_marketing_status": { "..." },
    "constraints_and_concerns": { "..." },
    "explicit_goals": { "..." },
    "missing_information": []
  },
  "projectId": "optional-project-id"
}
```

### 7.3 Response 結構（成功）

**HTTP 200**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `success` | `boolean` | 固定為 `true`。 |
| `data` | `GeneratedPresentation` | 即第四節之 JSON：`template_id` + `slides`（每頁 `slide_number`、`title`、`body`）。 |
| `requestId` | `string` | 可選，供除錯或日誌追蹤。 |

**`data` 型別**

```ts
interface GeneratedPresentation {
  template_id: string;
  slides: Array<{
    slide_number: number;
    title: string;
    body: string;
  }>;
}
```

- `title`、`body` 皆為可直接貼入 PPT 的純文字，無 Markdown、無額外說明。

---

## 八、失敗與錯誤處理設計

| 情境 | HTTP | Response Body | 說明 |
|------|------|---------------|------|
| **缺少 `template_id`** | 400 | `{ "success": false, "error": "template_id is required" }` | 未傳入或為空字串。 |
| **缺少 `extractedClientInfo`** | 400 | `{ "success": false, "error": "extractedClientInfo is required" }` | 未傳入或非物件。 |
| **`template_id` 不存在** | 400 | `{ "success": false, "error": "template_id not found" }` | 傳入的 `template_id` 與系統已載入的範本（STEP 2 定義）不符，無法取得母模板。 |
| **認證失敗** | 401 | `{ "success": false, "error": "Unauthorized" }` | Token 無效或過期。 |
| **AI 或範本載入失敗** | 502 / 503 | `{ "success": false, "error": "Presentation generation unavailable" }` | 填空服務或範本載入異常，可於 body 內附簡短原因（不暴露內部細節）。 |

- **不重試邏輯**：本文件僅定義錯誤回應格式；是否重試由前端或呼叫方決定。  
- **不產出部分結果**：若生成過程中失敗，應回傳錯誤狀態，**不**回傳「部分頁面」的 JSON，以避免前端誤用未完成內容。

---

## 九、與 STEP 1、STEP 2、STEP 3 的關係

| 步驟 | 關係 |
|------|------|
| **STEP 1** | 本 API 的 `extractedClientInfo` **必須**為 STEP 1 的輸出；填空時僅使用其中明確存在的欄位值，缺漏處以「（待確認）」標註，不補齊、不推測。 |
| **STEP 2** | 本 API 依 `template_id` 載入 STEP 2 已定義的母模板（固定頁數、頁序、每頁 `title_pattern`、`content_rules`、`allowed_variables`）；**不修改**範本結構，僅填入內容。 |
| **STEP 3** | `template_id` 必須為使用者在 STEP 3 **手動選定**的結果；系統不得自動帶入或預設，且僅在使用者選定後才允許呼叫本 API。 |

---

## 十、設計邊界確認（本步驟未含內容）

- ❌ 未設計審稿、優化、調整語氣的邏輯。  
- ❌ 未設計「依情境改寫句型」或「智慧補齊」；僅做變數代入與缺漏標註。  
- ✅ 已完成：模組功能說明、API endpoint 規劃（request / response）、失敗與錯誤處理（缺少 `template_id`、缺少 `extractedClientInfo`、`template_id` 不存在、401、502/503）。

完成後停止，等待下一步指示。
