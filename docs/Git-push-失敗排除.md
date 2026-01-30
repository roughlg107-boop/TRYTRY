# Git push 失敗排除：failed to push some refs

出現 `error: failed to push some refs to 'https://github.com/...'` 時，依情況處理。

---

## 情況一：遠端有你先沒有的提交（最常見）

例如在 GitHub 建立 repo 時勾了「Add a README」或「Add .gitignore」，遠端會多一個 commit，本機沒有，就會被拒絕。

### 作法 A：先拉再推（建議）

在專案根目錄執行：

```powershell
git pull origin main --rebase
git push origin main
```

若遠端分支叫 `master` 而不是 `main`，改成：

```powershell
git pull origin master --rebase
git push origin master
```

若出現「fatal: refusing to merge unrelated histories」，改用：

```powershell
git pull origin main --allow-unrelated-histories
# 若有衝突，依提示處理後：
git add .
git commit -m "Merge remote"
git push origin main
```

### 作法 B：強制覆蓋遠端（慎用）

**只有在你確定可以丟掉 GitHub 上現有內容時**才用（例如 repo 剛建、上面只有一個 README）：

```powershell
git push origin main --force
```

---

## 情況二：認證失敗

若錯誤訊息有 **Authentication failed**、**403**、**Permission denied**：

1. GitHub 已不支援用密碼 push，請改用 **Personal Access Token (PAT)**：
   - GitHub → Settings → Developer settings → Personal access tokens → Generate new token
   - 勾選 `repo` 權限，產生後**複製保存**
2. 再 push 時，密碼欄位貼上 **Token**（不要貼 GitHub 登入密碼）。

或用 SSH：

```powershell
git remote set-url origin git@github.com:roughlg107-boop/TRYTRY.git
git push origin main
```

（需先在 GitHub 設定 SSH key。）

---

## 情況三：看完整錯誤再對症下藥

在專案根目錄執行 push 時，**把整段錯誤訊息複製下來**（包含上面幾行），例如：

- 若寫 **"Updates were rejected..."** → 用「情況一」的作法 A。
- 若寫 **"Authentication failed"** 或 **"403"** → 用「情況二」。
- 若寫 **"File size too large"** → 表示有過大檔案，需從 commit 中移除或改用 Git LFS。

把完整錯誤貼給協助者，可更快對症下藥。
