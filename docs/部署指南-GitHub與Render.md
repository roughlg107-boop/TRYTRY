# 部署指南：先推上 GitHub，再部署到 Render

依序完成以下步驟即可。

---

## 第一步：將專案推上 GitHub

### 1. 確認 .env 不會被提交

專案根目錄的 `.gitignore` 已包含 `.env`、`*.env`，**請勿刪除**。  
`backend/.env` 內有你的 API Key，**絕對不要**提交到 GitHub。

### 2. 在 GitHub 建立新 Repository

1. 登入 [GitHub](https://github.com)，點右上角 **+** → **New repository**。
2. **Repository name**：例如 `presentation-system` 或 `成交型簡報系統`。
3. **Public** 或 **Private** 依需求選擇。
4. **不要**勾選 "Add a README"（專案已有 README）。
5. 點 **Create repository**。
6. 記下 GitHub 顯示的 **Repository URL**，例如：  
   `https://github.com/你的帳號/presentation-system.git`

### 3. 在本機初始化 Git 並推送到 GitHub

在**專案根目錄**（`TRYTRY` 資料夾）開啟終端機（PowerShell 或 CMD），依序執行：

```powershell
# 進入專案根目錄（若尚未在該目錄）
cd c:\Users\CHAI\Desktop\TRYTRY

# 若尚未初始化 Git
git init

# 加入所有檔案（.gitignore 會自動排除 .env、node_modules 等）
git add .

# 檢查是否有誤加入 .env（不應出現 backend\.env）
git status

# 第一次提交
git commit -m "Initial commit: backend + frontend + shared"

# 設定遠端 origin（請替換成你的 GitHub Repository URL）
# 若出現 "error: remote origin already exists."，改用下面這行「更新」網址：
git remote set-url origin https://github.com/你的帳號/你的repo名稱.git
# 若從未加過 origin，才用：git remote add origin https://github.com/你的帳號/你的repo名稱.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

- 若 GitHub 要求登入，請使用 **Personal Access Token** 或 **GitHub CLI**，不要用密碼。

### 4. 確認 GitHub 上有程式碼

到 GitHub 該 Repository 頁面，確認有 `backend/`、`frontend/`、`shared/`、`README.md` 等，且**沒有** `backend/.env` 或任何 `.env` 檔案。

---

## 第二步：在 Render 部署後端

### 1. 登入 Render

1. 開啟 [Render](https://render.com)，用 GitHub 帳號登入。
2. 若尚未連線 GitHub，依畫面指示授權 Render 存取你的 GitHub。

### 2. 建立 Web Service（後端）

1. 在 Render Dashboard 點 **New +** → **Web Service**。
2. **Connect a repository**：選擇你剛推上去的 **Repository**（例如 `presentation-system`）。
3. 若清單中沒有，點 **Configure account** 或 **Connect GitHub**，勾選該 repo 後再選一次。

### 3. 設定 Web Service

| 欄位 | 請填寫 |
|------|--------|
| **Name** | 例如 `presentation-backend`（會成為網址的一部分）。 |
| **Region** | 選離你較近的區域（如 Singapore）。 |
| **Root Directory** | 填 `backend`（重要：讓 Render 只建置 backend 資料夾）。 |
| **Runtime** | **Node**。 |
| **Build Command** | `npm install` 或 `npm ci`。 |
| **Start Command** | `npm start`。 |

### 4. 設定環境變數（必填）

在 **Environment** 區塊點 **Add Environment Variable**，新增：

| Key | Value | 說明 |
|-----|--------|------|
| `OPENAI_API_KEY` | 你的 OpenAI API Key | 必填，後端呼叫 OpenAI 用。 |
| `NODE_ENV` | `production` | 建議填。 |

- **不要**把 API Key 寫在程式碼裡，只填在 Render 的 Environment。  
- 若之後要接 Firebase Admin，可再補：`FIREBASE_PROJECT_ID`、`FIREBASE_CLIENT_EMAIL`、`FIREBASE_PRIVATE_KEY`。

### 5. 建立並等待部署

1. 點 **Create Web Service**。
2. Render 會 clone 你的 GitHub repo、進入 `backend`、執行 `npm install`、再執行 `npm start`。
3. 等待 **Build** 與 **Deploy** 完成（約 1～3 分鐘）。
4. 狀態變成 **Live** 後，上方會顯示 **Your service is live at** 的網址，例如：  
   `https://presentation-backend-xxx.onrender.com`

### 6. 確認後端可連線

- 在瀏覽器開啟：`https://你的服務名.onrender.com/health`  
  應看到 `{"ok":true}`。
- 若失敗，到 Render 該服務的 **Logs** 查看錯誤訊息（常見：`OPENAI_API_KEY` 未設、或 `shared/templates.json` 路徑問題）。

---

## 常見問題

### 部署失敗：OPENAI_API_KEY environment variable is missing or empty

**原因**：Render 上沒有設定 `OPENAI_API_KEY`，或建立服務時沒填。

**作法**：

1. 登入 [Render Dashboard](https://dashboard.render.com)，點進你的 **Web Service**（後端）。
2. 左側選 **Environment**。
3. 點 **Add Environment Variable**（或 **Add Key**）。
4. **Key** 填：`OPENAI_API_KEY`  
   **Value** 填：你的 OpenAI API Key（從 [OpenAI API keys](https://platform.openai.com/api-keys) 複製，勿加空格或引號）。
5. 儲存後，Render 會**自動重新部署**；等 Deploy 完成，服務就會正常啟動。
6. 開啟 `https://你的服務名.onrender.com/health` 應看到 `{"ok":true}`。

程式已改為「未設 key 時仍可啟動」，只有呼叫抽取／產出 API 時才會回傳錯誤；但若要正常使用，**一定要在 Render 的 Environment 填上 OPENAI_API_KEY**。

### Render 說找不到 `shared/templates.json`

本專案後端在執行時會從 **repo 根目錄** 讀取 `shared/templates.json`（路徑為 `backend` 的上一層）。  
Render 的 **Root Directory** 設為 `backend` 時，clone 的是**整個 repo**，所以 repo 根目錄會有 `shared/`，路徑是正確的。  
若你只上傳了 `backend` 資料夾到 GitHub（沒有 `shared`），請改為上傳**整個專案**（含 `shared`、`frontend`），再重新部署。

### 之後修改程式碼怎麼更新 Render？

在專案根目錄執行：

```powershell
git add .
git commit -m "說明你的修改"
git push origin main
```

Render 若已與該 GitHub repo 連動，會自動重新建置並部署（需在 Render 服務的 **Settings** 確認 **Auto-Deploy** 為 Yes）。

### 只想部署後端，前端之後再部署可以嗎？

可以。先完成上述「推上 GitHub → Render 部署後端」，拿到後端 URL。之後要部署前端到 Firebase 時，建置時設定 `VITE_API_BASE_URL=https://你的Render後端URL` 即可。

---

完成以上步驟後，你就會得到：

1. **GitHub**：程式碼已推送到 GitHub。  
2. **Render**：後端已上線，有一個對外的 URL（例如 `https://presentation-backend-xxx.onrender.com`）。

下一步可以將前端部署到 Firebase Hosting，並把上述後端 URL 設為 `VITE_API_BASE_URL`，使用者即可用單一網址使用系統。
