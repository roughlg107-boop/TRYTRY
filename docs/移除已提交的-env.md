# 移除已提交的 .env（解決 GitHub Push Protection）

若 push 被擋，錯誤寫 **Push cannot contain secrets**、**backend/.env**，代表 `.env` 曾被加入 commit，必須從 Git 裡移除（本機檔案可保留）。

---

## 步驟一：從 Git 追蹤移除，並改寫最後一次 commit

在**專案根目錄**執行：

```powershell
git rm --cached backend/.env
git add .gitignore
git commit --amend --no-edit
```

- `git rm --cached backend/.env`：只從 Git 追蹤移除，**本機的 backend/.env 不會被刪除**。
- `git commit --amend --no-edit`：把「移除 .env」併入**上一次** commit，讓歷史裡不再包含 .env。

---

## 步驟二：再推送到 GitHub

```powershell
git push -u origin main
```

若 GitHub 仍拒絕（例如有別的規則），可改用：

```powershell
git push -u origin main --force
```

（只有在確定遠端沒有別人依賴的 commit 時才用 `--force`。）

---

## 步驟三：輪換 OpenAI API Key（重要）

`.env` 曾進過 commit，GitHub 可能已掃到該 key，**請當作已外洩**：

1. 登入 [OpenAI API keys](https://platform.openai.com/api-keys)
2. 將**曾寫在 .env 裡的那組 key** 撤銷（Revoke）或刪除
3. 新增一組新的 API Key
4. 在本機 `backend/.env` 改填**新 Key**；之後若部署到 Render，在 Render 的 Environment 也改成新 Key

這樣即使舊 key 曾外流，也不會再被使用。
