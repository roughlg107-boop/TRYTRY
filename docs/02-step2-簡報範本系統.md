# STEP 2：簡報範本（母模板）系統設計

> 本系統的「簡報範本」為**固定成交節奏的結構模板（Slide-by-Slide Skeleton）**，非視覺樣式或主題分類。範本一旦建立，AI 僅能選擇或填入，**不可修改、合併、拆分或調整順序**。

---

## 一、範本系統的核心定義（嚴格遵守）

| 項目 | 說明 |
|------|------|
| **固定頁數** | 每個範本的 `slides` 數量固定，不可動態增減。 |
| **固定頁面順序** | `slide_number` 與陣列順序即為簡報頁序，不可調換。 |
| **每一頁固定「功能角色」** | `function_role` 定義該頁在成交節奏中的心理推進角色，不可由 AI 改寫。 |
| **範本不可由 AI 修改** | AI 在後續流程中**只能**依條件排除範本、建議 2～3 個候選，或依選定範本填入內容；**不能**設計、合併、拆分或調整範本。 |

---

## 二、範本的本質

- **範本** = 一套已被驗證可成交的「**說話時間軸**」。  
- **每一頁** = 一次**心理推進**，不可省略。  
- 即使頁面文字極少（如勾選頁、報價頁），仍視為**獨立且必要**的一頁。

---

## 三、範本資料結構（JSON 化）

### 3.1 頂層結構

| 欄位 | 型別 | 說明 |
|------|------|------|
| `template_id` | `string` | 唯一識別碼，系統與 API 皆以此識別範本。 |
| `template_name` | `string` | 顯示用名稱（如「穩定成交型」）。 |
| `intended_usage` | `string` | 此範本適用情境說明，供使用者與排除邏輯參考。 |
| `absolute_exclusion_conditions` | `string[]` | 滿足任一條即**不可使用**此範本；條目為可判斷的條件描述（如「報告明確提及預算極度有限」）。 |
| `slides` | `Slide[]` | 固定頁數、固定順序的投影片骨架陣列。 |

### 3.2 單頁（Slide）結構

| 欄位 | 型別 | 說明 |
|------|------|------|
| `slide_number` | `number` | 頁序（從 1 起）。 |
| `function_role` | `string` | 此頁功能角色，例如：共識建立 / 風險定位 / 差異對照 / 選項收斂 / 確認。 |
| `title_pattern` | `string` | 固定句型結構，例如：「不是 ___ ，而是 ___」「現階段重點不在 ___」。 |
| `content_rules` | `string` | 此頁**不能寫什麼**（例如：不可說服、不可講方案）。 |
| `allowed_variables` | `string[]` | 僅允許被填入的欄位 key，來自 STEP 1 的 `ExtractedClientInfo`（使用 dot 路徑，如 `company_profile.company_name`）。 |

### 3.3 allowed_variables 對應 STEP 1 的 key 約定

STEP 1 輸出為 `ExtractedClientInfo`，巢狀路徑如下，範本中 `allowed_variables` 使用相同路徑：

- `company_profile.company_name`  
- `company_profile.industry`  
- `company_profile.business_type`  
- `company_profile.company_size`  
- `company_profile.location`  
- `decision_makers.primary_decision_maker`  
- `decision_makers.other_influencers`  
- `decision_makers.decision_style_notes`  
- `current_marketing_status.existing_channels`  
- `current_marketing_status.short_video_experience`  
- `current_marketing_status.current_problems_mentioned`  
- `constraints_and_concerns.budget_mentions`  
- `constraints_and_concerns.time_or_resource_limits`  
- `constraints_and_concerns.explicit_concerns`  
- `explicit_goals.stated_goals`  
- `explicit_goals.timeframe_mentions`  

（`missing_information` 僅供缺漏標示，不作為「填入簡報內文」的變數來源。）

---

## 四、AI 與範本的權限邊界

| AI 只能做 | AI 絕對不能做 |
|-----------|----------------|
| 依 `absolute_exclusion_conditions` 與客戶資料**排除**不適合的範本 | **決定**最終使用哪一個範本（由使用者點選） |
| 在未排除的範本中，產出 **2～3 個可能適合**的範本建議清單 | **混合**兩個範本 |
| 在**使用者已選定**範本後，依該範本填入內容 | **調整**範本內容、頁數、順序或功能角色 |

---

## 五、範本在整體系統流程中的角色

```
[STEP 1] 客戶資訊抽取 → 產出 ExtractedClientInfo
                ↓
[STEP 2 本系統] 範本為「唯讀母模板」
                → 後端依 exclusion 條件過濾
                → 回傳 2～3 個候選範本（template_id + template_name 等）給前端
                ↓
[使用者] 在前端點選一個範本（選定 template_id）
                ↓
[STEP 4] 最終簡報產出
                → 僅能依「選定的範本」之 slides 結構
                → 固定頁數、頁序、每頁 function_role / title_pattern / content_rules
                → 僅將 allowed_variables 對應的 STEP 1 欄位填入，產出簡報文字
```

- **範本**：系統預先定義並儲存（如 JSON 檔或 Firestore），**不被 AI 改寫**。  
- **範本建議 API**：輸入為 STEP 1 的 `ExtractedClientInfo`（及可選的步驟 2 過往簡報結構）；輸出為候選範本清單；**不**輸出「應選哪一個」的結論。  
- **最終簡報產出**：輸入為「使用者選定的 `template_id`」+ `ExtractedClientInfo`；僅依該範本填空，不改變結構。

---

## 六、三個簡報母模板完整 JSON 定義

以下三個範本：**頁數不同、節奏不同、適用情境明確**，且皆具備 `absolute_exclusion_conditions` 與每頁 `content_rules` / `allowed_variables`。

---

### 6.1 穩定成交型（最常用）

- **頁數**：8 頁  
- **節奏**：標準成交節奏，共識 → 需求 → 風險 → 差異 → 方案 → 收斂 → 異議預處理 → 確認。  
- **適用情境**：一般 B2B 第二次拜訪、決策者已見面、有基本預算與時程討論空間。

**不可使用條件（absolute_exclusion_conditions）**：

- 報告中明確提及「預算極度有限」或「僅能小額試單」。
- 報告中明確提及決策者「尚未見面」或「僅透過窗口接觸」。
- 報告中明確提及「高層要求本週內必須定案」，且客戶方資源/共識明顯不足。

**完整 JSON**：

```json
{
  "template_id": "stable_close",
  "template_name": "穩定成交型",
  "intended_usage": "最常用。適用於已與決策者見面、有基本預算與時程討論空間的 B2B 第二次拜訪，採標準成交節奏：共識建立 → 需求對焦 → 風險定位 → 差異對照 → 方案對應 → 選項收斂 → 異議預處理 → 確認下一步。",
  "absolute_exclusion_conditions": [
    "報告中明確提及預算極度有限或僅能小額試單",
    "報告中明確提及決策者尚未見面或僅透過窗口接觸",
    "報告中明確提及高層要求本週內必須定案且客戶方資源或共識明顯不足"
  ],
  "slides": [
    {
      "slide_number": 1,
      "function_role": "共識建立",
      "title_pattern": "今天我們聚焦在 ___",
      "content_rules": "不可推銷方案、不可承諾成效；僅陳述今天要討論的範圍與共識基礎。",
      "allowed_variables": ["company_profile.company_name", "explicit_goals.stated_goals"]
    },
    {
      "slide_number": 2,
      "function_role": "需求對焦",
      "title_pattern": "現階段重點不在 ___ ，而在 ___",
      "content_rules": "不可否定客戶現狀；僅對焦報告中已寫出的需求與時程。",
      "allowed_variables": ["explicit_goals.stated_goals", "explicit_goals.timeframe_mentions", "current_marketing_status.current_problems_mentioned"]
    },
    {
      "slide_number": 3,
      "function_role": "風險定位",
      "title_pattern": "若不做 ___ ，可能面對 ___",
      "content_rules": "不可誇大風險、不可恐嚇；僅就報告中已提及的顧慮或限制做中性陳述。",
      "allowed_variables": ["constraints_and_concerns.explicit_concerns", "current_marketing_status.current_problems_mentioned"]
    },
    {
      "slide_number": 4,
      "function_role": "差異對照",
      "title_pattern": "和您現在的做法相比，差異在 ___",
      "content_rules": "不可貶低客戶現有做法；僅對照報告中已寫的現有管道或做法。",
      "allowed_variables": ["current_marketing_status.existing_channels", "current_marketing_status.short_video_experience"]
    },
    {
      "slide_number": 5,
      "function_role": "方案對應",
      "title_pattern": "針對 ___ ，我們可以 ___",
      "content_rules": "不可過度承諾成效或時程；僅對應報告中已寫的目標與限制。",
      "allowed_variables": ["explicit_goals.stated_goals", "constraints_and_concerns.budget_mentions", "constraints_and_concerns.time_or_resource_limits"]
    },
    {
      "slide_number": 6,
      "function_role": "選項收斂",
      "title_pattern": "接下來可以選 ___ 或 ___",
      "content_rules": "不可只給單一選項；須給出有限選項並說明差異，不代客戶做決定。",
      "allowed_variables": ["explicit_goals.timeframe_mentions", "decision_makers.primary_decision_maker"]
    },
    {
      "slide_number": 7,
      "function_role": "異議預處理",
      "title_pattern": "您可能會想 ___ ；實際上是 ___",
      "content_rules": "不可強辯；僅就報告中已寫的顧慮做簡短回應，不延伸新議題。",
      "allowed_variables": ["constraints_and_concerns.explicit_concerns", "decision_makers.decision_style_notes"]
    },
    {
      "slide_number": 8,
      "function_role": "確認",
      "title_pattern": "請確認：我們下一步是 ___",
      "content_rules": "不可新增未討論的承諾；僅總結報告中已對焦的下一步與負責人。",
      "allowed_variables": ["decision_makers.primary_decision_maker", "decision_makers.other_influencers", "explicit_goals.timeframe_mentions"]
    }
  ]
}
```

---

### 6.2 保守試水型（預算低、風險高顧慮）

- **頁數**：6 頁  
- **節奏**：縮短、強調可控與低風險，共識 → 風險定位（可控）→ 差異對照（低風險）→ 小步選項 → 顧慮回應 → 確認。  
- **適用情境**：預算有限、決策者對風險敏感、需要「先試一點再擴大」的節奏。

**不可使用條件（absolute_exclusion_conditions）**：

- 報告中明確提及「預算充足」或「可接受較高投入」。
- 報告中明確提及「高層要求快速全面推動」或「希望一次到位」。

**完整 JSON**：

```json
{
  "template_id": "conservative_trial",
  "template_name": "保守試水型",
  "intended_usage": "適用於預算有限、決策者對風險敏感、需要「先試一點再擴大」的情境。節奏較短，強調可控與低風險：共識建立 → 風險定位（可控）→ 差異對照（低風險）→ 小步選項 → 顧慮回應 → 確認。",
  "absolute_exclusion_conditions": [
    "報告中明確提及預算充足或可接受較高投入",
    "報告中明確提及高層要求快速全面推動或希望一次到位"
  ],
  "slides": [
    {
      "slide_number": 1,
      "function_role": "共識建立",
      "title_pattern": "今天只談 ___ ，不談 ___",
      "content_rules": "不可擴大範圍；僅界定本次討論邊界，降低決策壓力。",
      "allowed_variables": ["company_profile.company_name", "explicit_goals.stated_goals"]
    },
    {
      "slide_number": 2,
      "function_role": "風險定位（可控）",
      "title_pattern": "若先做 ___ ，風險可控在 ___",
      "content_rules": "不可淡化風險也不可誇大；僅就報告中已寫的顧慮說明「小步」如何控制風險。",
      "allowed_variables": ["constraints_and_concerns.explicit_concerns", "constraints_and_concerns.budget_mentions", "constraints_and_concerns.time_or_resource_limits"]
    },
    {
      "slide_number": 3,
      "function_role": "差異對照（低風險）",
      "title_pattern": "和您現在的做法相比，變動最小的是 ___",
      "content_rules": "不可建議大規模改變；僅對照報告中現有做法，強調「變動最小」的選項。",
      "allowed_variables": ["current_marketing_status.existing_channels", "current_marketing_status.short_video_experience"]
    },
    {
      "slide_number": 4,
      "function_role": "小步選項",
      "title_pattern": "第一步可以是 ___ ，再視結果決定 ___",
      "content_rules": "不可推銷大方案；僅給出最小可行第一步，並明確「可再議」。",
      "allowed_variables": ["explicit_goals.stated_goals", "explicit_goals.timeframe_mentions", "decision_makers.primary_decision_maker"]
    },
    {
      "slide_number": 5,
      "function_role": "顧慮回應",
      "title_pattern": "您提到的 ___ ，我們可以這樣處理：___",
      "content_rules": "不可否定客戶顧慮；僅就報告中已寫的顧慮做簡短、具體回應。",
      "allowed_variables": ["constraints_and_concerns.explicit_concerns", "decision_makers.decision_style_notes"]
    },
    {
      "slide_number": 6,
      "function_role": "確認",
      "title_pattern": "請確認：我們下一步只做 ___",
      "content_rules": "不可加入未討論的承諾；僅總結「最小下一步」與負責人。",
      "allowed_variables": ["decision_makers.primary_decision_maker", "explicit_goals.timeframe_mentions"]
    }
  ]
}
```

---

### 6.3 推進加速型（老闆敢、要快）

- **頁數**：5 頁  
- **節奏**：快速、直接，共識（快）→ 差異對照 → 方案對應 → 選項收斂 → 確認。  
- **適用情境**：決策者已授權、時程緊、希望快速推進，不需長篇風險與異議處理。

**不可使用條件（absolute_exclusion_conditions）**：

- 報告中明確提及「需要再內部討論」或「尚未取得共識」。
- 報告中明確提及「預算需分批審核」或「先試跑再決定是否擴大」。

**完整 JSON**：

```json
{
  "template_id": "fast_forward",
  "template_name": "推進加速型",
  "intended_usage": "適用於決策者已授權、時程緊、希望快速推進的情境。節奏快、頁數少：共識（快）→ 差異對照 → 方案對應 → 選項收斂 → 確認；不展開長篇風險與異議處理。",
  "absolute_exclusion_conditions": [
    "報告中明確提及需要再內部討論或尚未取得共識",
    "報告中明確提及預算需分批審核或先試跑再決定是否擴大"
  ],
  "slides": [
    {
      "slide_number": 1,
      "function_role": "共識建立（快）",
      "title_pattern": "今天目標：___",
      "content_rules": "不可拉長背景；僅一句話對焦今天要決定的範圍與目標。",
      "allowed_variables": ["company_profile.company_name", "explicit_goals.stated_goals", "explicit_goals.timeframe_mentions"]
    },
    {
      "slide_number": 2,
      "function_role": "差異對照",
      "title_pattern": "和現狀的差異：___",
      "content_rules": "不可展開多頁；僅一頁對照報告中已寫的現有做法與可改變點。",
      "allowed_variables": ["current_marketing_status.existing_channels", "current_marketing_status.current_problems_mentioned"]
    },
    {
      "slide_number": 3,
      "function_role": "方案對應",
      "title_pattern": "針對 ___ ，我們可以 ___",
      "content_rules": "不可過度承諾；僅對應報告中已寫的目標與時程，直接給方案輪廓。",
      "allowed_variables": ["explicit_goals.stated_goals", "explicit_goals.timeframe_mentions", "constraints_and_concerns.time_or_resource_limits"]
    },
    {
      "slide_number": 4,
      "function_role": "選項收斂",
      "title_pattern": "請選擇：___ 或 ___",
      "content_rules": "不可模糊；僅給出有限選項與建議，由決策者點選。",
      "allowed_variables": ["decision_makers.primary_decision_maker", "explicit_goals.timeframe_mentions"]
    },
    {
      "slide_number": 5,
      "function_role": "確認",
      "title_pattern": "下一步：___ ，負責人 ___",
      "content_rules": "不可新增未討論項目；僅總結下一步、負責人與時程。",
      "allowed_variables": ["decision_makers.primary_decision_maker", "decision_makers.other_influencers", "explicit_goals.timeframe_mentions"]
    }
  ]
}
```

---

## 七、每個範本的「不可使用條件」彙總

| 範本 | template_id | 不可使用條件（滿足任一條即排除） |
|------|-------------|----------------------------------|
| 穩定成交型 | `stable_close` | ① 報告明確提及預算極度有限或僅能小額試單 ② 決策者尚未見面或僅透過窗口接觸 ③ 高層要求本週內定案且客戶資源/共識明顯不足 |
| 保守試水型 | `conservative_trial` | ① 報告明確提及預算充足或可接受較高投入 ② 報告明確提及高層要求快速全面推動或一次到位 |
| 推進加速型 | `fast_forward` | ① 報告明確提及需要再內部討論或尚未取得共識 ② 報告明確提及預算需分批審核或先試跑再決定是否擴大 |

排除邏輯由「範本建議」模組（或後端服務）實作：比對 STEP 1 的 `ExtractedClientInfo`（及報告原文若需要）與各範本的 `absolute_exclusion_conditions`，將符合任一條件的範本從候選清單移除，回傳剩餘 2～3 個範本供使用者**點選**，不由 AI 決定最終範本。

---

## 八、設計邊界確認（本步驟未含內容）

- ❌ 未進入簡報文字生成階段。  
- ❌ 未設計 AI prompt。  
- ✅ 已完成：範本資料結構、三份完整 JSON、不可使用條件、範本在整體流程中的角色、AI 與範本權限邊界。

完成後停止，等待下一步指示。
