# 部署指南：前端部署到 Firebase Hosting

GitHub 與 Render 已完成後，依下列步驟將前端部署到 Firebase，使用者即可用單一網址使用系統。

---

## 前提

- 後端已部署到 Render，並取得後端 URL，例如：`https://presentation-backend-xxx.onrender.com`
- 本機已安裝 **Node.js** 與 **npm**

---

## 第一步：建立 Firebase 專案

1. 登入 [Firebase Console](https://console.firebase.google.com)。
2. 點 **建立專案**（或 **Add project**）。
3. 輸入專案名稱（例如 `presentation-system`），依提示完成建立。
4. 若詢問是否啟用 Google Analytics，可選 **否**（或依需求選擇）。
5. 專案建立完成後，記下 **專案 ID**（在專案設定中可看到）。

---

## 第二步：啟用 Hosting

1. 在 Firebase Console 左側選 **Hosting**（建置 → Hosting）。
2. 點 **開始使用**，依畫面指示即可（不需在本機先建置，下一步會做）。

---

## 第三步：本機安裝 Firebase CLI 並登入

在 **PowerShell** 或 **命令提示字元** 執行（建議在專案根目錄外執行，避免裝進專案）：

```powershell
npm install -g firebase-tools
firebase login
```

- `firebase login` 會開啟瀏覽器，請用 **Google 帳號** 登入並授權。
- 若出現權限錯誤，可改用：`firebase login --no-localhost`，依畫面顯示的網址與代碼登入。

---

## 第四步：在專案根目錄連結 Firebase 專案

在**專案根目錄**（`C:\Users\CHAI\Desktop\TRYTRY`）執行：

```powershell
cd C:\Users\CHAI\Desktop\TRYTRY
firebase use --add
```

1. 選取你剛建立的 **Firebase 專案**（用方向鍵選擇，Enter 確認）。
2. 若詢問別名，直接 Enter（使用預設 `default`）即可。
3. 完成後會產生 `.firebaserc`，用來記錄連結的專案。

---

## 第五步：設定前端建置用的後端 URL

前端建置時必須知道後端 API 網址，請把 **Render 後端 URL** 寫進環境變數。

在 `frontend` 目錄下建立 **`.env.production`**（若已存在則編輯）：

**路徑**：`frontend/.env.production`

**內容**（請替換成你的 Render 後端 URL，勿加尾端斜線）：

```
VITE_API_BASE_URL=https://你的Render後端服務名.onrender.com
```

例如：

```
VITE_API_BASE_URL=https://presentation-backend-xxx.onrender.com
```

- 建置時 Vite 會讀取 `.env.production`，把 `VITE_API_BASE_URL` 寫進前端，部署後前端就會呼叫這個網址。
- **請勿**把 `.env.production` 提交到 GitHub（若內含敏感資訊）；若只放後端 URL（公開網址），可選擇提交或加入 `.gitignore`。本專案後端 URL 為公開，可提交；若不想提交，請將 `frontend/.env.production` 加入 `.gitignore`。

---

## 第六步：建置前端

在專案根目錄執行：

```powershell
cd C:\Users\CHAI\Desktop\TRYTRY\frontend
npm install
npm run build
```

- 建置完成後會產生 **`frontend/dist`** 資料夾（即 `firebase.json` 中設定的 `public` 目錄）。

---

## 第七步：部署到 Firebase Hosting

在**專案根目錄**執行：

```powershell
cd C:\Users\CHAI\Desktop\TRYTRY
firebase deploy --only hosting
```

- 完成後終端機會顯示 **Hosting URL**，例如：  
  `https://你的專案ID.web.app` 或 `https://你的專案ID.firebaseapp.com`

---

## 第八步：用單一網址使用系統

將上述 **Hosting URL** 分享給使用者，在瀏覽器開啟即可：

1. STEP 1：輸入第一次拜訪報告 → 送出
2. STEP 2：選擇範本 → 確認並產出簡報
3. STEP 3：檢視產出與安全檢查結果

無需安裝或設定，拿到網址即可使用。

---

## 常見問題

### 建置時沒有讀到 VITE_API_BASE_URL

- 確認 `frontend/.env.production` 存在，且內容為 `VITE_API_BASE_URL=https://...`（無空格、無引號）。
- 建置指令要在 **frontend** 目錄執行 `npm run build`，或從根目錄執行 `cd frontend && npm run build`。

### firebase: command not found

- 表示 Firebase CLI 未正確安裝或不在 PATH。請重新執行：  
  `npm install -g firebase-tools`  
  並確認終端機關閉後重開再試。

### 部署後前端打不開或 API 失敗

- 開啟瀏覽器開發者工具（F12）→ Network，看 API 請求是否指向正確的 Render URL。
- 若請求仍是 `localhost` 或錯誤網址，表示建置時未讀到 `VITE_API_BASE_URL`，請檢查 `frontend/.env.production` 並重新建置、再部署一次。

### 之後修改程式碼如何更新 Firebase？

1. 修改前端程式後，在 `frontend` 目錄執行 `npm run build`。
2. 在專案根目錄執行 `firebase deploy --only hosting`。
3. 若後端 URL 有變，請更新 `frontend/.env.production` 後再建置、部署。
