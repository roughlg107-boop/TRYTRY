# STEP 5：安全檢查與輸出鎖定模組（Output Guardrail）

> 本模組的角色**不是優化器、不是潤稿器**，而是「**只刪不改、只阻擋不修正**」的守門員。僅做違規檢測、標記/刪除違規段落、阻止輸出並回傳錯誤原因；**不得嘗試修正文字、不得重新生成內容**。

---

## 一、模組唯一目的（不可偏離）

檢查 **STEP 4 產出的「最終簡報文字」**（即 `GeneratedPresentation`：`template_id` + `slides[]` 的 `title`、`body`），確保內容**完全符合**成交型簡報模板規則。若不符合：

- **可單純刪除的違規內容** → 直接刪除該段落或句子，產出「刪除後版本」作為 `final_output`，並將違規項記錄於 `violations`（可標記為已處理）。  
- **違規影響整體結構** → **阻止輸出**，`final_output` 設為 `null`，並回傳錯誤原因（`violations`），**不得**嘗試改寫成安全版本。

---

## 二、此模組「允許的唯一行為」

| 允許行為 | 說明 |
|----------|------|
| **檢測違規內容** | 依下述「必須檢測的違規類型」逐條檢查 STEP 4 輸出的每一頁 `title`、`body`。 |
| **標記或刪除違規段落** | 若違規為「可單純刪除」的語句（如單句顧問語），則直接刪除該句/段，不改寫；並在 `violations` 中記錄類型、描述、位置（如 `slide_3_body`）。 |
| **阻止輸出並回傳錯誤原因** | 若違規影響整體結構（如頁數不符、頁序錯亂、缺頁），則 `status = fail`、`final_output = null`，並在 `violations` 中列出所有違規項。 |

| **嚴格禁止** | 說明 |
|--------------|------|
| ❌ 不得嘗試修正文字 | 不將違規句改寫為「安全版本」；僅能刪除或阻擋。 |
| ❌ 不得重新生成內容 | 不呼叫 AI 或任何生成邏輯產出替代文字。 |

---

## 三、必須檢測的違規類型（逐條硬性規則）

### 3.1 顧問語 / 教學語檢測

若 **任一頁**的 `title` 或 `body` 中出現以下**語意**（含同義、近義或明顯變體），視為違規：

| 違規語意關鍵詞（示例） | 說明 |
|------------------------|------|
| 建議、應該、適合、策略、規劃、最佳 | 顧問/建議型用語。 |
| 市場趨勢、行銷價值、品牌建立 | 教學/分析型用語。 |

- **檢查方式（文字層級）**：對每頁 `title`、`body` 做關鍵詞或語意比對；命中即記錄為違規，`type` 為 `advisory_or_teaching`，`location` 標註頁號與欄位（如 `slide_2.body`）。  
- **處理方式**：若僅為單句或可明確區隔的段落，**直接刪除**該句/段，不改寫；若整頁充斥或無法單純刪除而不影響語意連貫，則可視專案規則選擇「刪除後仍通過」或「該頁視為結構違規、阻擋輸出」（建議：可刪即刪，刪後仍不符合模板語氣則阻擋）。  

（實作時可採關鍵詞列表 + 正則或簡易 NLP，**不**使用「生成式改寫」。）

### 3.2 結構違規檢測

| 違規項 | 說明 | 檢查方式 |
|--------|------|----------|
| **頁數與模板不一致** | STEP 4 輸出的 `slides` 陣列長度 ≠ 該 `template_id` 對應之 STEP 2 母模板的 `slides` 數量。 | 比對 `generated.slides.length` 與 `template.slides.length`。 |
| **頁序與模板不一致** | 任一 `slide_number` 與母模板該索引的 `slide_number` 不符，或順序錯亂。 | 逐項比對 `generated.slides[i].slide_number` 與 `template.slides[i].slide_number`。 |
| **缺少任一模板定義頁面** | 母模板有 N 頁，但 STEP 4 輸出少於 N 頁，或缺少某 `slide_number`。 | 依母模板的 `slide_number` 集合檢查輸出是否完整。 |

- **處理方式**：結構違規**一律阻擋輸出**（`status = fail`，`final_output = null`），不得嘗試補頁或重新排序。  
- **violations**：`type = structure`，`description` 簡述違規項（如「頁數與模板不一致：模板 8 頁，輸出 7 頁」），`location` 可為 `slides` 或 `slides.length`。

### 3.3 角色越權檢測

| 違規項 | 說明 | 檢查方式（文字層級） |
|--------|------|------------------------|
| **AI 自行下結論** | 出現非來自 STEP 1 客戶資訊、且非模板句型內的「結論句」（如「因此最適合…」「綜上建議…」）。 | 可依關鍵詞或句型模式偵測（如「因此」「綜上」「建議」「最適合」等），或比對該頁 `allowed_variables` 與母模板 `content_rules`，判斷是否出現未允許的論述。 |
| **未在模板中定義的判斷句** | 該頁 `title_pattern` / `content_rules` 未定義的評價、判斷語（如「此方案最佳」「貴公司適合…」）。 | 比對輸出句與模板該頁的 `title_pattern` 與 `content_rules`；若輸出明顯超出「僅填入變數」範圍，標記為違規。 |

- **處理方式**：若可明確定位為單句/段，**直接刪除**；若無法單純刪除而不破壞結構或語意，則**阻擋輸出**。  
- **violations**：`type = role_overreach`，`description` 簡述（如「出現未在模板中定義的判斷句」），`location` 標註頁號與欄位。

### 3.4 禁止用語檢測（業務對老闆講話規則）

依 **`docs/簡報生成-強制修正指令.md`**，簡報內文與標題**不得**出現以下詞彙或同義語：

| 禁止詞彙（示例） | 說明 |
|------------------|------|
| 功能角色、本頁、目前顯示、有助於、計畫制定、後續執行、顯示出 | 非「業務本人對老闆講話」用語。 |
| 待確認 | 缺漏時應使用「這一段我們等下確認」，不得用「待確認」。 |

- **檢查方式**：對每頁 `title`、`body` 做關鍵詞比對；命中即記錄為違規，`type` 為 `banned_phrase`，`description` 為「禁止用語（業務對老闆講話規則）：{詞彙}」，`location` 標註頁號與欄位。  
- **處理方式**：**一律阻擋輸出**（`status = fail`，`final_output = null`），不刪除後通過（因用語代表整體語氣不符）。

---

## 四、處理方式（嚴格遵守）

| 情境 | 處理方式 |
|------|----------|
| **違規內容可單純刪除** | 直接刪除該句/段；刪除後若結構與頁數/頁序仍符合模板，則 `status = pass`，`final_output` 為**刪除後**的 STEP 4 格式輸出（非原始 STEP 4 輸出）。`violations` 仍記錄該違規項，可加註「已刪除」。 |
| **違規影響整體結構** | **阻止輸出**：`status = fail`，`final_output = null`，`violations` 列出所有違規項（含結構、角色越權等）。 |
| **不得嘗試「改寫成安全版本」** | 僅允許「刪除」或「阻擋」；**禁止**將違規句改寫、潤稿或重新生成。 |

- 若採用「刪除後通過」：`final_output` 必須為**完整且符合模板頁數/頁序**的 `GeneratedPresentation`，不得缺頁或亂序。

---

## 五、輸出格式（固定）

本模組輸出必須為以下 **單一 JSON 結構**：

```json
{
  "status": "pass | fail",
  "violations": [
    {
      "type": "",
      "description": "",
      "location": ""
    }
  ],
  "final_output": null
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `status` | `"pass"` \| `"fail"` | 通過：無違規或違規已以「刪除」處理且結構仍正確；不通過：違規影響整體結構或無法單純刪除。 |
| `violations` | `ViolationItem[]` | 本次檢查發現的所有違規項（含已刪除者亦可記錄，可加註已處理）。 |
| `violations[].type` | `string` | 違規類型：`advisory_or_teaching` / `structure` / `role_overreach`（與第三節對應）。 |
| `violations[].description` | `string` | 違規簡述（如「出現顧問語：建議」），**不得**包含完整違規原文（見第六節前端顯示限制）。 |
| `violations[].location` | `string` | 位置標註（如 `slide_2.body`、`slides.length`）。 |
| `final_output` | `GeneratedPresentation` \| `null` | **若 `status = pass`**：為 STEP 4 原始輸出或「刪除違規後」的完整簡報 JSON。**若 `status = fail`**：**必須為 `null`**。 |

- 前端或下載邏輯**僅**在 `status = pass` 且 `final_output` 非 `null` 時，允許將該內容視為「最終簡報」供下載、複製或顯示。

---

## 六、系統層鎖定規則（非常重要）

| 規則 | 說明 |
|------|------|
| **未通過 STEP 5 的內容不得被使用** | 當 `status = fail` 或 `final_output === null` 時，該內容**不得**被下載、複製或顯示為「最終簡報」。前端僅能顯示「檢查未通過」及違規原因（`violations` 的 `type`、`description`、`location`）。 |
| **不得顯示原始違規文字** | 前端**必須**顯示「違規原因」（即 `violations` 中的 `description`、`location`），但**不得**顯示或洩漏原始違規句的完整內容，以避免誤用或複製違規文字。 |
| **通過後才解鎖** | 僅當 `status = pass` 且 `final_output` 非 `null` 時，前端才允許「下載」「複製」「顯示為最終簡報」等操作。 |

---

## 七、與 STEP 4 的串接流程

```
[STEP 4] POST /api/v1/generate-presentation
         → 後端產出 GeneratedPresentation（template_id + slides[]）
                    ↓
[後端] 在回傳給前端之前，先呼叫 STEP 5 安全檢查
         → 輸入：STEP 4 的原始輸出 + 對應的母模板（依 template_id 載入）
         → 依「顧問語/教學語」「結構」「角色越權」逐條檢測
                    ↓
[STEP 5] 若可刪除違規且結構仍正確 → 產出「刪除後」的 JSON
         若違規影響結構或無法單純刪除 → status = fail，final_output = null
                    ↓
[後端] 將 STEP 5 結果回傳給前端
         → 若 status = pass：回傳 { success: true, data: { guardrailResult }, data.presentation: final_output } 或等效結構
         → 若 status = fail：回傳 { success: false, data: { guardrailResult } }，不包含 final_output
                    ↓
[前端] 若 pass → 顯示 final_output 為最終簡報，允許下載/複製
       若 fail → 僅顯示 violations（type、description、location），不顯示原始違規文字，不提供下載/複製
```

- **串接時機**：STEP 5 建議於**後端**在 STEP 4 產出後**立即**執行，不將未經檢查的 STEP 4 輸出直接回傳給前端；或由前端在收到 STEP 4 回應後再呼叫 STEP 5 API，惟須確保**未通過時絕不展示為最終簡報**。  
- **輸入**：STEP 5 的輸入為「STEP 4 的輸出」+「該 `template_id` 對應的母模板」（用於結構與頁數/頁序比對）。  
- **輸出**：STEP 5 的輸出為固定格式 `GuardrailResult`（`status`、`violations`、`final_output`）；下游（前端或後端聚合邏輯）依 `status` 與 `final_output` 決定是否解鎖顯示/下載。

---

## 八、檢查規則設計方式（文字層級）

- **顧問語/教學語**：維護一份違規關鍵詞列表（建議、應該、適合、策略、規劃、最佳、市場趨勢、行銷價值、品牌建立等），對每頁 `title`、`body` 做字串或正則掃描；命中即記錄違規類型與位置。可擴充同義詞或簡短片語，**不**使用生成式改寫。  
- **結構違規**：純資料比對。載入該 `template_id` 的母模板，比較 `slides.length`、每筆 `slide_number` 與順序；任一不符即記錄結構違規並設 `status = fail`。  
- **角色越權**：可結合「違規關鍵詞」與「模板該頁 `content_rules` / `allowed_variables`」做比對；若某句明顯不屬於「僅填入變數」的產出（如整句為結論、建議），則記錄為 `role_overreach`。實作時以規則與關鍵詞為主，**不**使用「生成式判斷」。  

以上皆為**文字層級 / 規則比對**，不包含任何「生成」或「修正」邏輯。

---

## 九、設計邊界確認（本步驟未含內容）

- ❌ 未加入任何生成或修正邏輯。  
- ✅ 已完成：模組功能說明、檢查規則設計方式（文字層級）、與 STEP 4 的串接流程、輸出格式、系統層鎖定規則。

完成後停止，等待下一步指示。
