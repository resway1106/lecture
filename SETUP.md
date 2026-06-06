# Google Sheet 後端設定指南

本指南帶你把網頁從「資料寫死在 HTML」改成「從 Google Sheet 即時讀寫」。
設定完成後：

- ✅ 在 Sheet 修改 → 重新整理網頁就生效
- ✅ 管理者帳密存在 Sheet 內，不在原始碼
- ✅ 透過網頁後台編輯時，會即時寫回 Sheet
- ✅ 海報仍放在 GitHub `posters/` 資料夾

整個設定約 15–20 分鐘，照著步驟做即可。

---

## 步驟 1：建立 Google Sheet

1. 開啟 https://sheets.google.com → 點「**+**」建立空白試算表
2. 把試算表命名為「**奇美醫院全院演講**」（隨意，僅供識別）
3. 在底部建立 **3 個工作表**，命名為（注意大小寫）：
   - `Years`
   - `Courses`
   - `Auth`

### 1-1. `Years` 工作表

A1～F1 填入以下標題列（每格一個）：

| year | adYear | updated | location | timeStart | timeEnd |
|---|---|---|---|---|---|

從第 2 列開始填年度設定：

| year | adYear | updated | location | timeStart | timeEnd |
|---|---|---|---|---|---|
| 114 | 2025 | 114.12.15 | 第五醫療大樓五樓國際會議廳 | 07:30 | 08:30 |
| 115 | 2026 | 115.06.04 | 第五醫療大樓五樓國際會議廳 | 07:30 | 08:30 |
| 116 | 2027 | 尚未公告 | 第五醫療大樓五樓國際會議廳 | 07:30 | 08:30 |
| 117 | 2028 | 尚未公告 | 第五醫療大樓五樓國際會議廳 | 07:30 | 08:30 |
| 118 | 2029 | 尚未公告 | 第五醫療大樓五樓國際會議廳 | 07:30 | 08:30 |
| 119 | 2030 | 尚未公告 | 第五醫療大樓五樓國際會議廳 | 07:30 | 08:30 |
| 120 | 2031 | 尚未公告 | 第五醫療大樓五樓國際會議廳 | 07:30 | 08:30 |

### 1-2. `Courses` 工作表

A1～P1 填入以下標題列：

| id | year | date | weekday | status | topic | speaker | host | timeStart | timeEnd | poster | tags | details | note | special | skeleton |

欄位說明：

| 欄位 | 範例 | 說明 |
|---|---|---|
| **id** | 1, 2, 3… | 流水號，由系統自動產生（新增時可留空） |
| **year** | 115 | 民國年（對應 Years 工作表的 year） |
| **date** | 6/24 | 月/日 |
| **weekday** | 三 | 星期（一/二/三/四/五/六/日） |
| **status** | _空白_ / cancelled / holiday / tba | 留空＝正常開課 |
| **topic** | 跨越醫院圍牆... | 講題 |
| **speaker** | Bruce A. Leff, MD（…） | 主講者及單位 |
| **host** | 黃建程主任 | 主持人 |
| **timeStart** | _空白_ 或 16:00 | 留空＝沿用 Years 的 07:30 |
| **timeEnd** | _空白_ 或 17:00 | 留空＝沿用 Years 的 08:30 |
| **poster** | posters/1150624.jpg | 海報相對路徑（檔案放 GitHub） |
| **tags** | 品質⏎社會、長照⏎CFD 核心 | 每行一個學分類別（Alt+Enter 換行） |
| **details** | 醫師、專師繼續教育「品質」⏎… | 學分明細，每行一筆（Alt+Enter 換行） |
| **note** | 本場次特殊時間 | 備註 |
| **special** | 住院醫師論文評選 | 特殊標記 |
| **skeleton** | _空白_ 或 yes | 自動產出的骨架場次 |

> 💡 在 Google Sheet 裡按 **Alt + Enter**（Mac：Option + Enter）可以在同一格中換行

### 1-3. `Auth` 工作表

A1～C1 填入：

| username | passwordHash | displayName |

第 2 列預設管理者：

| username | passwordHash | displayName |
|---|---|---|
| admin | da4c31ae5a3b30d9774a2c2eafac5d725d25abe4e18f6e35bc452d428ea3618c | 管理者 |

> 這串雜湊對應密碼 `chimei2026`。**請務必之後變更**（用網頁的「產生新密碼雜湊」工具，把新雜湊貼回這格）。

---

## 步驟 2：部署 Apps Script

1. 在 Sheet 上方選單：**擴充功能 → Apps Script**
2. 把預設的 `function myFunction() {}` 整段刪掉
3. 打開專案資料夾中的 `apps-script.gs` 檔案，**整個內容複製貼上**
4. 點上方軟碟圖示 **儲存**（或 Ctrl+S）
5. 點右上角 **部署 → 新增部署作業**
6. 點齒輪 ⚙ → 選 **網頁應用程式**
7. 設定：
   - **說明**：奇美演講 API（自訂）
   - **執行身分**：我（你的 email）
   - **誰可以存取**：**任何人**
8. 點 **部署**
9. 首次部署會要求授權 → 點 **授權存取權** → 選你的 Google 帳號 → 點「**進階**」→「**前往（不安全）**」→「**允許**」
10. 部署完成後會看到一個 **網頁應用程式網址**，類似：

    ```
    https://script.google.com/macros/s/AKfycb.../exec
    ```

    **完整複製這串網址**（包含結尾的 `/exec`）

> ⚠️ 若日後修改了 Apps Script 程式碼，**必須點「部署 → 管理部署作業 → 編輯 ✏️ → 版本選新版本 → 部署」** 才會生效

---

## 步驟 3：把 URL 設定到 index.html

1. 打開 `index.html`
2. 用 Ctrl+F 找 `APPS_SCRIPT_URL`
3. 把空字串改成你剛剛複製的網址：

   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```

4. 存檔 → commit → push

```powershell
git add index.html
git commit -m "綁定 Google Sheet 後端"
git push
```

---

## 步驟 4：匯入現有資料（一次性）

如果你已經有 114、115 年的資料，需要轉到 Sheet。最簡單方式：

### 方式 A：用網頁工具匯出（推薦）

1. 在「**設定 URL 之前**」的舊版網頁登入管理者
2. （未來會新增）點工具列「📤 匯出為 Sheet TSV」按鈕
3. 複製產生的文字
4. 在 Google Sheet `Courses` 工作表第 2 列貼上即可

### 方式 B：手動輸入

依現有 `index.html` 內的資料，逐筆填入 Sheet。

> 💡 我會幫你產一份初始 TSV 檔（`initial-courses.tsv`），可以直接在 Sheet 用「檔案 → 匯入 → 上傳 → 取代目前資料表」匯入

---

## 步驟 5：測試

1. 打開部署好的網頁（GitHub Pages 網址）
2. 應該會看到「載入中…」短暫顯示，然後出現課程
3. 點右下「管理者登入」→ 輸入 `admin` / `chimei2026` → 應能登入
4. 試著編輯一筆課程 → 儲存 → 重新整理頁面 → 改動應該還在
5. 打開 Google Sheet → 確認那筆課程的對應列被改動

---

## 常見問題

### Q：網頁顯示「載入課程資料失敗」？
- 檢查 `APPS_SCRIPT_URL` 是否完整正確
- 開啟瀏覽器 F12 → Console 看錯誤訊息
- 確認 Apps Script 部署時「誰可以存取」選的是「任何人」

### Q：登入時顯示「未授權」？
- 確認 `Auth` 工作表的 `passwordHash` 是否正確（64 字元 hex）
- 確認部署後沒有再修改 Apps Script 但沒重新部署
- 用網頁的「產生新密碼雜湊」工具產生新雜湊覆蓋

### Q：改動 Apps Script 後沒生效？
- Apps Script 部署是「版本化」的：每次改完都要「管理部署作業 → 編輯 → 版本選新版本」
- 或直接重新部署一次

### Q：怎麼新增另一位管理者？
- 在 `Auth` 工作表新增一列：填 username、passwordHash（用網頁工具產生）、displayName
- 立即生效（不用重新部署）

### Q：海報怎麼換？
- 海報仍放在 GitHub `posters/` 資料夾（沒變）
- Sheet 的 `poster` 欄位只填路徑，例如 `posters/1160305.jpg`
- 上傳新海報：把檔案 commit 到 GitHub posters/，並在 Sheet 填入路徑
- 或用網頁後台的海報上傳：選檔 → 自動命名 → 下載 → 放到 posters/

### Q：可以離線使用嗎？
- 不行。每次開頁面都要連 Google Sheet 取資料
- 若需要離線備份：用網頁後台的「匯出 HTML」（會把當下 Sheet 內容嵌入靜態 HTML）

---

## 安全提醒

- **Apps Script「任何人可存取」≠ 任何人可寫**：寫入動作會驗證密碼雜湊
- **密碼以 SHA-256 雜湊儲存於 Sheet**：建議用強密碼，避免被字典攻擊
- **建議定期更換管理者密碼**：用網頁的「產生新密碼雜湊」工具
- **若有多位管理者**：每人一組獨立帳密，便於追蹤誰改的（未來可加入修改紀錄欄）
