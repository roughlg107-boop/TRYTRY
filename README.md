# 成交型簡報生成系統

本系統為「**業務決策輔助 + 簡報模板填空系統**」：使用者輸入第一次拜訪報告與（可選）過往簡報後，由系統在**既定模板**中產出可直接使用的成交型簡報文字；AI 不決策、不自由發揮，範本選擇權在使用者。

---

## 單一網址即可使用（Render + Firebase）

**可以。** 使用 **Render（後端）** 與 **Firebase Hosting（前端）** 部署後：

- **使用者**：只需拿到 **Firebase Hosting 的網址**（例如 `https://你的專案.web.app`），在瀏覽器開啟即可使用。
- **無需**：安裝軟體、登入帳號、設定環境變數或開啟任何本機程式；拿到網址就能用。

**原理**：前端部署在 Firebase Hosting，建置時已把後端 API 網址（Render 的 URL）寫進前端；使用者開啟前端網址時，頁面會自動向 Render 後端發送請求，一切在雲端完成。

---

## 系統流程簡圖（文字描述）

```
STEP 1  輸入第一次拜訪報告 → 客戶資訊抽取（結構化 JSON + 缺漏標示）
   ↓
STEP 2  （可選）上傳過往成功簡報 → 結構解析（僅解析，不摘要/不重寫）
   ↓
STEP 3  系統提供 2～3 個範本建議 → 使用者手動選擇一個範本
   ↓
STEP 4  依選定範本產出簡報文字（固定頁數、頁序、每頁角色）
   ↓
STEP 5  安全檢查與輸出鎖定 → 通過則可下載/複製；未通過則僅顯示違規原因，不得下載
```

- 未通過 STEP 5 的內容**不得**被顯示為最終簡報或提供下載。  
- 使用者**不可**跳過任一步驟、**不可**直接呼叫 STEP 4 或 STEP 5 API、**不可**看到任何 prompt；流程必須線性完成。

---

## 專案結構（Monorepo）

| 資料夾 | 說明 |
|--------|------|
| **frontend/** | React + Vite，部署於 Firebase Hosting，認證使用 Firebase Auth（匿名登入即可）。僅負責輸入、顯示中間結果與最終簡報；**不得**呼叫 OpenAI、存放 prompt 或邏輯判斷。 |
| **backend/** | Node.js + Express，部署於 Render。提供所有 AI 相關 API（STEP 1～5）；機密資訊一律使用環境變數。 |
| **shared/** | 前後端共用型別、JSON schema、範本定義（無機密、無商業邏輯）。 |
| **docs/** | 設計與架構文件（STEP 0～6）。 |

---

## 本機啟動方式

**前提**：clone 本 repo 後，僅需設定環境變數即可啟動，不需額外本機環境。後端須從**專案根目錄**啟動，以便讀取 `shared/templates.json`。

### 1. 後端（Backend）

```bash
cd backend
cp .env.example .env
# 編輯 .env，至少填入 OPENAI_API_KEY=
npm install
npm run dev
```

- 後端會監聽 `http://localhost:3000`（或 `PORT` 環境變數）。  
- 若從專案根目錄執行，請使用：`node backend/index.js`，並確保 `backend` 內有 `node_modules`（可先 `cd backend && npm install`）。

### 2. 前端（Frontend）

```bash
cd frontend
# 本機開發時可不設 VITE_API_BASE_URL（Vite 會將 /api 代理到 localhost:3000）
# 或建立 .env：VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev
```

- 前端會於 `http://localhost:5173` 啟動。  
- 開啟瀏覽器依流程操作：STEP 1 輸入報告 → STEP 2 選擇範本 → STEP 3 檢視產出與安全檢查結果。

---

## 部署到 Render / Firebase 的步驟

**逐步圖文說明**：可參考 [部署指南：先推上 GitHub，再部署到 Render](docs/部署指南-GitHub與Render.md)。

### 後端（Render）逐步

1. 登入 [Render](https://render.com)，點 **New** → **Web Service**。  
2. 連線至你的 **GitHub**，選擇本 repo。  
3. **Root Directory** 填 `backend`。  
4. **Build Command**：`npm install`（或 `npm ci`）。  
5. **Start Command**：`npm start`。  
6. **Environment** 新增變數：
   - `OPENAI_API_KEY` = 你的 OpenAI API Key  
   - `NODE_ENV` = `production`  
   - （若需 Firebase Admin）`FIREBASE_PROJECT_ID`、`FIREBASE_CLIENT_EMAIL`、`FIREBASE_PRIVATE_KEY`  
7. 點 **Create Web Service**，等待部署完成。  
8. 記下服務 URL，例如 `https://presentation-backend-xxx.onrender.com`。

**注意**：Render 的 Root 為 `backend` 時，`shared` 在 repo 根目錄，後端程式會以 `join(__dirname, "..", "..", "shared", "templates.json")` 讀取，即從 `backend/routes` 往上一層到 `backend` 再上一層到 repo 根目錄的 `shared`。因此部署時需確保 repo 根目錄含有 `shared`（即 Monorepo 完整 clone），Render 預設會 clone 整個 repo，故路徑正確。

### 前端（Firebase Hosting）逐步

1. 於 [Firebase Console](https://console.firebase.google.com) 建立專案，啟用 **Hosting**、**Authentication**（匿名登入，可選）。  
2. 本機安裝 Firebase CLI：`npm i -g firebase-tools`，執行 `firebase login`。  
3. 在**專案根目錄**執行 `firebase init`，選 **Hosting**；**Public directory** 填 `frontend/dist`；單頁應用選 No（或 Yes 皆可）。  
4. 在 `frontend` 目錄建立 `.env.production` 或建置前設定環境變數：  
   `VITE_API_BASE_URL=https://你的Render後端URL`（例如 `https://presentation-backend-xxx.onrender.com`，勿加尾端斜線）。  
5. 建置前端：`cd frontend && npm run build`。  
6. 部署：在專案根目錄執行 `firebase deploy --only hosting`。  
7. 完成後 Firebase 會顯示 **Hosting URL**（如 `https://xxx.web.app`）。  
8. **將這個網址分享給使用者**：使用者只需在瀏覽器開啟此網址，無需安裝或設定任何東西，即可依 STEP 1 → 3 操作。

**部署後使用者體驗**：使用者拿到 Firebase Hosting 網址 → 開啟 → 輸入拜訪報告 → 選擇範本 → 取得簡報結果；全程在瀏覽器完成，不需開啟其他程式或做任何設定。

（CI/CD 可後續以 GitHub Actions 等自動觸發 Render 與 Firebase 部署。）

---

## 使用者操作流程（STEP 1 → STEP 5）

1. **STEP 1**：輸入第一次拜訪報告（貼上或上傳）→ 系統產出客戶資訊 JSON 與缺漏標示；使用者可檢視或補齊。  
2. **STEP 2（可選）**：上傳過往成功簡報 → 系統僅做結構解析；可略過。  
3. **STEP 3**：點選「取得範本建議」→ 系統回傳 2～3 個可選範本；**使用者必須手動點選一個範本**，不可自動帶入。  
4. **STEP 4**：使用者點選「產出簡報」→ 系統依選定範本產出簡報文字（固定頁數、頁序）。  
5. **STEP 5**：系統自動執行安全檢查；**通過**則可下載/複製最終簡報，**未通過**則僅顯示違規原因（不顯示原始違規文字），不得下載或複製。

- 使用者**不可**跳過任一步驟、**不可**直接呼叫 STEP 4 或 STEP 5 API、**不可**看到任何 prompt；所有流程必須線性完成。

---

## 設計文件

- [專案架構與總體設計](docs/00-專案架構與總體設計.md)  
- [STEP 1 客戶資訊抽取模組](docs/01-step1-客戶資訊抽取模組.md)  
- [STEP 2 簡報範本系統](docs/02-step2-簡報範本系統.md)  
- [STEP 3 範本排除與建議模組](docs/03-step3-範本排除與建議模組.md)  
- [STEP 4 簡報填空生成模組](docs/04-step4-簡報填空生成模組.md)  
- [STEP 5 安全檢查與輸出鎖定模組](docs/05-step5-安全檢查與輸出鎖定模組.md)  
- [STEP 6 部署與開源結構](docs/06-step6-部署與開源結構.md)

---

## 環境變數（摘要）

| 變數 | 使用端 | 用途 |
|------|--------|------|
| `OPENAI_API_KEY` | Backend | 呼叫 OpenAI API（STEP 1 抽取、STEP 4 填空）；必填。 |
| `PORT` | Backend | 服務埠；本機可設 3000，Render 會自動注入。 |
| `VITE_API_BASE_URL` | Frontend（建置時） | 後端 API 基底 URL；本機開發可不設（Vite proxy 會轉到 localhost:3000），部署時設為 Render 後端 URL。 |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Backend（可選） | 若使用 Firebase Admin 驗證或 Firestore 時使用。 |

- 所有機密資訊**不得**寫入程式碼；clone 後僅需設定環境變數即可啟動。  
- Backend 範例見 `backend/.env.example`；專案根目錄 `.env.example` 為總覽。
