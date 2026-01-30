# Git 第一次提交：設定作者後再 commit + push

若出現 **Author identity unknown** 或 **src refspec main does not match any**，代表還沒設定 Git 作者，commit 沒成功，所以沒有可 push 的內容。

---

## 依序執行（在專案根目錄 TRYTRY）

### 1. 設定 Git 作者（只需做一次，之後都可沿用）

把下面的信箱與名字改成**你自己的**（可與 GitHub 帳號一致）：

```powershell
git config --global user.email "你的信箱@example.com"
git config --global user.name "你的名字或 GitHub 帳號"
```

例如：

```powershell
git config --global user.email "roughlg107-boop@gmail.com"
git config --global user.name "roughlg107-boop"
```

### 2. 確認檔案已加入並提交

```powershell
git add .
git status
git commit -m "Initial commit: backend + frontend + shared"
```

此時應看到 `1 file changed` 或 `X files changed`，**不再**出現 Author identity unknown。

### 3. 推送到 GitHub

```powershell
git branch -M main
git push -u origin main
```

若遠端已有內容（例如建立 repo 時勾了 README），先拉再推：

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

完成後，到 GitHub 該 repo 頁面重新整理，應能看到程式碼。
