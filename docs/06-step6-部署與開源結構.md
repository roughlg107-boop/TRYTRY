# STEP 6：部署與開源結構（Production Ready）

> 本步驟目標：讓此系統**可直接部署到 GitHub + Render + Firebase**，並讓**任何使用者不需本機設定即可使用**。此文件僅為架構與設定說明，**不包含實際程式碼**；CI/CD 可留備註後續實作。

---

## 一、專案總體部署原則（必須符合）

| 原則 | 說明 |
|------|------|
| **Monorepo 結構** | 單一 Repository 包含 `frontend`、`backend`、`shared`；根目錄 README、.gitignore、.env.example 統一管理。 |
| **前後端可獨立部署** | 前端與後端各自有 build / start 指令，可分別部署至 Firebase Hosting 與 Render，互不綁定。 |
| **機密資訊不得寫入程式碼** | 所有 API Key、Service Account、Private Key 等**一律使用環境變數**；程式碼與 repo 中不得出現真實 key。 |
| **clone 後僅需設定環境變數即可啟動** | 開發者 clone repo 後，依 README 複製 `.env.example` 為 `.env`（或於各子專案設定），填入必要變數後即可在本機啟動 frontend / backend。 |

---

## 二、Repository 結構（明確列出）

```
/project-root
├── /frontend          # React + Vite，部署於 Firebase Hosting + Firebase Auth
├── /backend           # Node.js + Express，部署於 Render
├── /shared            # 共用型別、JSON schema、範本定義（無機密、無邏輯）
├── /docs               # 設計與架構文件（STEP 0～6）
├── README.md           # 專案說明、本機啟動、部署步驟、使用者流程
├── .env.example        # 環境變數範例（無真實 key）
└── .gitignore           # 排除 .env、node_modules、build 產物等
```

### 各資料夾責任邊界

| 資料夾 | 責任 | 不得包含 |
|--------|------|----------|
| **frontend** | 使用者介面、表單輸入、流程導引、呼叫後端 API、顯示中間結果與最終簡報文字；Firebase Auth（匿名登入）。 | 不得呼叫 OpenAI API；不得存放任何 prompt 或邏輯判斷（策略、範本選擇、填空規則等）。 |
| **backend** | 提供所有 AI 相關 API（STEP 1～5）；呼叫 OpenAI、載入範本、安全檢查；與 Firebase Admin（若需寫入 Firestore）互動。 | 不得將 API Key 或 Service Account 寫入程式碼；敏感設定一律從環境變數讀取。 |
| **shared** | 前後端共用的型別定義、常數、範本 JSON（STEP 2 母模板）；僅「資料結構與常數」。 | 不得包含商業邏輯、AI 呼叫、prompt、機密資訊。 |
| **docs** | 設計文件（STEP 0～6）、部署說明、API 與流程描述。 | 不得包含真實 key 或密碼。 |

---

## 三、前端部署（Firebase Hosting）

### 3.1 前端職責與限制

| 僅負責 | 不得 |
|--------|------|
| 輸入資料（拜訪報告、可選過往簡報） | 呼叫 OpenAI API |
| 顯示中間結果（STEP 1 抽取結果、STEP 3 範本清單） | 存放任何 prompt 或邏輯判斷（策略、範本選擇、填空規則、違規檢測規則等） |
| 顯示最終簡報文字（通過 STEP 5 後） | 繞過步驟或直接呼叫 STEP 4 / STEP 5 API |
| 流程導引（STEP 1 → 2 → 3 → 4，線性完成） | 讓使用者看到任何 prompt |
| Firebase Auth（匿名登入即可） | — |

### 3.2 Firebase 初始化流程（概念）

1. **建立 Firebase 專案**：於 Firebase Console 建立專案，啟用 Hosting、Authentication（匿名登入）、必要時 Firestore。  
2. **取得前端設定**：Firebase Console → 專案設定 → 一般 → 您的應用程式 → 新增 Web App，取得 `apiKey`、`authDomain`、`projectId`、`storageBucket`、`messagingSenderId`、`appId`（此為**公開**設定，可寫入前端程式碼或建置時注入）。  
3. **前端程式初始化**：於 frontend 內以 Firebase JS SDK 初始化 `initializeApp(config)`、`getAuth()`；登入採用 `signInAnonymously(auth)` 即可。  
4. **呼叫後端 API 時**：以 `user.getIdToken()` 取得 ID Token，於請求 Header 帶入（如 `Authorization: Bearer <token>`），後端可選擇以 Firebase Admin 驗證。

（實際程式碼不於本步驟撰寫，僅說明流程。）

### 3.3 環境變數使用方式（前端）

- **建置時變數**：後端 API 的**基底 URL**（如 `VITE_API_BASE_URL=https://your-backend.onrender.com`）須於建置時注入，前端以 `import.meta.env.VITE_*` 讀取；**不得**在前端存放 OpenAI Key 或 Firebase Service Account。  
- **公開設定**：Firebase 前端 config（apiKey、authDomain、projectId 等）可寫入程式碼或同為建置時變數，依團隊規範；此為 Firebase 設計上允許的公開資訊。

### 3.4 部署指令（Firebase Hosting）

- **建置**：於 `frontend` 目錄執行 `npm run build`（或專案定義之 build 指令）。  
- **部署**：`firebase deploy --only hosting`（需已登入 `firebase login` 並於專案根或 frontend 設定 `firebase.json` 之 `hosting.public` 指向 `frontend/dist`）。  
- 首次部署前須完成 `firebase init`（選擇 Hosting、指定 `frontend/dist` 為 public 目錄）。

---

## 四、後端部署（Render）

### 4.1 後端職責

- 提供所有 AI 相關 API：STEP 1（客戶資訊抽取）、STEP 2（範本為靜態，可僅由後端載入）、STEP 3（範本建議）、STEP 4（簡報填空生成）、STEP 5（安全檢查與輸出鎖定）。  
- 以環境變數存放：**OpenAI API Key**、**Firebase Service Account**（若需驗證 Token 或寫入 Firestore）。

### 4.2 Render Web Service 設定方式（概念）

1. **建立 Web Service**：於 Render Dashboard 選擇 New → Web Service，連線至本 GitHub repo。  
2. **根目錄 / 建置與啟動**：Root Directory 設為 `backend`（或專案內 backend 之路徑）；Build Command 與 Start Command 見下節。  
3. **環境變數**：於 Render 的 Environment 頁籤新增所有必要變數（OPENAI_API_KEY、FIREBASE_* 等），**不要**將 key 寫入 repo。  
4. **對外網址**：Render 會提供 `https://<service-name>.onrender.com`，此 URL 即為前端的 `VITE_API_BASE_URL`。

### 4.3 Build / Start 指令（後端）

- **Build Command**：`npm install` 或 `npm ci`（若使用 lockfile）；若有 TypeScript 編譯可為 `npm run build`（依 backend 專案定義）。  
- **Start Command**：`npm start` 或 `node dist/index.js` 等，以實際 backend 入口為準；需監聽 `PORT`（Render 會注入）。  
- Render 會自動執行 Build 後再執行 Start。

### 4.4 後端環境變數列表

| 變數 | 必填 | 說明 |
|------|------|------|
| `PORT` | 由 Render 注入 | 服務監聽埠。 |
| `OPENAI_API_KEY` | 是 | OpenAI API 金鑰，供 STEP 1 / 3 / 4 等呼叫 OpenAI 使用。 |
| `NODE_ENV` | 建議 | 如 `production`。 |
| `FIREBASE_PROJECT_ID` | 若使用 Firebase Admin | Firebase 專案 ID。 |
| `FIREBASE_CLIENT_EMAIL` | 若使用 Firebase Admin | Service Account 的 client_email。 |
| `FIREBASE_PRIVATE_KEY` | 若使用 Firebase Admin | Service Account 的 private_key（注意換行與跳脫）。 |
| （可選）`FRONTEND_ORIGIN` | 若需 CORS | 前端網址，如 `https://your-app.web.app`。 |

---

## 五、環境變數設計（必須列清楚）

以下為**最少**需說明的變數；實際專案可再擴充。

| 變數名稱 | 使用端 | 用途 |
|----------|--------|------|
| `OPENAI_API_KEY` | Backend | 呼叫 OpenAI API（STEP 1 抽取、STEP 3 範本建議、STEP 4 填空等）；**不得**寫入程式碼或提交至 repo。 |
| `FIREBASE_PROJECT_ID` | Backend | Firebase 專案 ID；用於 Firebase Admin SDK 初始化（驗證 ID Token、寫入 Firestore 等）。 |
| `FIREBASE_CLIENT_EMAIL` | Backend | Firebase Service Account 的 `client_email`；用於 Admin SDK 身分驗證。 |
| `FIREBASE_PRIVATE_KEY` | Backend | Firebase Service Account 的 `private_key`；用於 Admin SDK 簽章。注意：若從 JSON 複製，需保留 `\n` 換行或於程式內還原。 |
| `VITE_API_BASE_URL` | Frontend（建置時） | 後端 API 基底 URL（如 `https://your-backend.onrender.com`），前端用於呼叫 STEP 1～5 API。 |

- **.env.example**：於專案根或 backend 目錄提供範例，內容為上述變數名稱與空值（或 placeholder），並註解說明用途；**不得**填入真實 key。  
- **.gitignore**：必須包含 `.env`、`*.env.local` 等，確保本機填入的 key 不會被提交。

---

## 六、README.md 必須包含的內容（結構）

README 需清楚寫出以下區塊（本步驟產出為**結構初稿**，實際段落由 README.md 檔案呈現）：

1. **專案目的（一句話版）**  
   例：本系統為「業務決策輔助 + 簡報模板填空系統」，使用者輸入第一次拜訪報告與（可選）過往簡報後，由系統在既定模板中產出可直接使用的成交型簡報文字；AI 不決策、不自由發揮，範本選擇權在使用者。

2. **系統流程簡圖（文字描述即可）**  
   STEP 1（拜訪報告 → 客戶資訊抽取）→ STEP 2（可選：過往簡報結構解析）→ STEP 3（範本建議，使用者點選）→ STEP 4（依選定範本填空產出簡報）→ STEP 5（安全檢查與輸出鎖定）；未通過 STEP 5 不得顯示為最終簡報。

3. **本機啟動方式（frontend / backend）**  
   - Backend：進入 `backend`，複製 `.env.example` 為 `.env` 並填入 `OPENAI_API_KEY` 等，執行 `npm install`、`npm run dev`（或專案定義指令）。  
   - Frontend：進入 `frontend`，設定 `VITE_API_BASE_URL` 為本機後端（如 `http://localhost:3000`），執行 `npm install`、`npm run dev`。  
   - 註明：clone 後只需設定環境變數即可啟動，不需額外本機環境。

4. **部署到 Render / Firebase 的步驟**  
   - Render：連線 GitHub repo，Root 指向 backend，設定 Build / Start 指令與環境變數，部署後取得後端 URL。  
   - Firebase：`firebase init`（Hosting、指定 frontend 建置產物），前端建置時設定 `VITE_API_BASE_URL` 為 Render 後端 URL，`firebase deploy --only hosting`。  
   - 使用者不需本機設定即可使用已部署之前端網址。

5. **使用者操作流程（STEP 1 → STEP 5）**  
   依序：輸入第一次拜訪報告 →（可選）上傳過往簡報 → 取得範本建議清單 → **使用者手動選擇一個範本** → 產出簡報 → 系統執行安全檢查；通過則可下載/複製最終簡報，未通過則僅顯示違規原因、不可下載。  
   - 註明：使用者不可跳過任一步驟、不可直接呼叫 STEP 4 或 STEP 5 API、不可看到任何 prompt；流程必須線性完成。

（以上為 README 必須涵蓋之結構；實際撰寫見專案根目錄 README.md。）

---

## 七、使用者體驗與安全限制

| 限制 | 說明 |
|------|------|
| **使用者不可看到任何 prompt** | 所有 prompt、填空規則、違規檢測規則等僅存在於後端；前端僅顯示輸入表單、中間結果（抽取 JSON、範本清單）、最終簡報文字與違規原因（description/location），**不**顯示原始違規內容或任何系統提示詞。 |
| **使用者不可跳過任一步驟** | 前端流程必須為線性：STEP 1 完成後才可進入 STEP 2（可選）與 STEP 3；STEP 3 使用者選定範本後才可觸發 STEP 4；STEP 4 產出後由後端自動執行 STEP 5，前端依結果決定是否顯示/下載。不得提供「跳過」或「直達某步驟」的入口。 |
| **使用者不可直接呼叫 STEP 4 或 STEP 5 API** | 前端**不得**在未經 STEP 1～3 完成、未經使用者選定範本的情況下呼叫「產出簡報」API；STEP 5 由後端在 STEP 4 產出後自動執行，前端不單獨呼叫 STEP 5。後端可選擇驗證請求（如是否具備有效 session / 選定範本紀錄）以阻擋非法呼叫。 |
| **所有流程必須線性完成** | 依序：輸入報告 →（可選）上傳簡報 → 取得範本建議 → 使用者點選範本 → 產出簡報 → 安全檢查 → 通過則解鎖下載/複製。 |

---

## 八、各平台設定清單（總覽）

### 8.1 GitHub

- 建立 Repository（建議 Public，開源）。  
- 專案結構為 Monorepo：`frontend`、`backend`、`shared`、`docs`、README.md、.env.example、.gitignore。  
- **不要**提交 `.env` 或任何含真實 key 的檔案；`.gitignore` 須包含 `.env`、`*.env.local`、`node_modules`、build 產物等。  
- README 內註明：本機啟動需複製 `.env.example` 並填入環境變數；部署時於 Render / Firebase 設定對應變數。

### 8.2 Render（後端）

- New → Web Service，連線至 GitHub repo。  
- Root Directory：`backend`（或實際後端目錄）。  
- Build Command：`npm ci` 或 `npm run build`（依專案）。  
- Start Command：`npm start` 或等同指令。  
- Environment：新增 `OPENAI_API_KEY`、`FIREBASE_PROJECT_ID`、`FIREBASE_CLIENT_EMAIL`、`FIREBASE_PRIVATE_KEY`（若使用 Firebase Admin）、`NODE_ENV=production`、必要時 `FRONTEND_ORIGIN`。  
- 部署完成後取得 URL，供前端 `VITE_API_BASE_URL` 使用。

### 8.3 Firebase（前端 + Auth）

- Firebase Console：建立專案，啟用 Hosting、Authentication（匿名登入）、必要時 Firestore。  
- 取得 Web App config（apiKey、authDomain、projectId 等）；前端初始化與 Auth 使用。  
- 本機：`firebase login`、於專案根或 frontend 執行 `firebase init`，選擇 Hosting，public 目錄設為 `frontend/dist`。  
- 部署：前端先以 `VITE_API_BASE_URL=<Render 後端 URL>` 建置，再執行 `firebase deploy --only hosting`。  
- 使用者體驗與安全：依第七節，不暴露 prompt、不允許跳步、不允許直接呼叫 STEP 4/5。

---

## 九、設計邊界確認（本步驟未含內容）

- ❌ 不需撰寫實際程式碼。  
- ❌ 不需實作 CI/CD（可於 README 或本文件留備註「後續可加入 GitHub Actions / Render 自動部署」）。  
- ✅ 已完成：完整部署架構說明、各平台（GitHub / Render / Firebase）設定清單、環境變數設計、README 初稿結構、使用者體驗與安全限制。

完成後停止。
