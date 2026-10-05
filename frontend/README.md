# 🛡️ 保險智慧助理 - 前端應用 (Frontend)

本專案為「保險智慧助理 (Insurance Assistance)」的前端 Web 應用，採用 **React 19** 與 **Vite** 建置。提供流暢直覺的對話式介面，支援即時保單資訊檢視、理賠文件指引、追問引導以及完整的對話歷史管理功能。

---

## 📑 目錄

- [專案簡介](#-專案簡介)
- [核心功能亮點](#-核心功能亮點)
- [技術棧與工具](#-技術棧與工具)
- [專案目錄結構](#-專案目錄結構)
- [環境變數設定](#-環境變數設定)
- [快速開始](#-快速開始)
- [Docker 容器化與部署](#-docker-容器化與部署)
- [相關連結](#-相關連結)

---

## 💡 專案簡介

前端應用做為保戶與保險系統的主要互動入口，透過與後端 AP Server 意圖辨識 AI 整合，將複雜的保險查詢與理賠指引流程轉化為直覺的交談對話體驗。具備即時串流打字效果、結構化卡片渲染與離線歷史保存能力。

---

## ✨ 核心功能亮點

1. **交談式智慧助理**
   - **打字機漸進輸出**：平滑的文字輸出動畫，營造真實互動感。
   - **快捷常見問題**：一鍵帶入「查詢我的保單」、「理賠需要哪些文件」等常見提問。
   - **中文輸入防呆優化**：阻擋選字階段的 Enter 送出事件，保障中文輸入體驗。
   - **自動捲動**：新訊息送出或回覆生成時自動平滑捲動至視窗底部。

2. **結構化保單與理賠指引卡片**
   - **保單狀態清單 (`PolicyList`)**：視覺化呈現保單有效（`ACTIVE`）、到期（`EXPIRED`）、終止（`TERMINATED`）或暫停中（`SUSPENDED`）標籤。
   - **理賠情境追問選單**：若使用者未指定理賠類型，系統自動提供「住院」、「意外」、「手術」、「旅遊意外」等快捷選項供點擊送出。

3. **完整的歷史對話管理**
   - **可收合側邊欄**：支援展開與收合側邊欄，適應不同螢幕與使用習慣。
   - **多對話切換**：可建立新對話並即時切換不同主題的對話內容。
   - **重新命名與刪除**：支援對話標題直接點選編輯（支援 Esc 取消），並提供防誤刪確認對話框 (`ConfirmDialog`)。
   - **本機持久化**：使用 `localStorage` 保存對話紀錄，重新整理或重啟瀏覽器不遺失。

4. **健全的錯誤處理與一鍵重試**
   - **人性化錯誤訊息**：將 HTTP 400、401、429、5xx 狀態碼轉換為使用者易讀的友善提示文字。
   - **一鍵重新傳送**：通訊異常時直接在對話框內提供「重新傳送」按鈕，快速重發失敗請求。

---

## 🛠️ 技術棧與工具

- **核心框架**：[React 19](https://react.dev/)
- **建置工具**：[Vite 8](https://vite.dev/)
- **單頁路由**：[React Router 7](https://reactrouter.com/)
- **程式碼檢查**：[Oxlint](https://oxc.rs/)（超高速 JavaScript/JSX Linter）
- **靜態伺服器**：[serve](https://www.npmjs.com/package/serve)（容器執行環境託管 SPA 靜態檔案）
- **容器基底**：Node.js 20 Alpine

---

## 📂 專案目錄結構

```
frontend/
├── public/                 # 靜態資源 (圖示、favicon)
├── src/
│   ├── assets/             # 圖檔資源 (robot.png, user.png, logo.png 等)
│   ├── components/         # 介面共用元件
│   │   ├── ConfirmDialog.jsx # 確認對話框 (刪除確認等)
│   │   ├── Icons.jsx         # SVG 圖示集合 (Logo, Robot, Send 等)
│   │   ├── PolicyList.jsx    # 保單清單與狀態標籤元件
│   │   └── Sidebar.jsx       # 歷史對話側邊欄與選單
│   ├── hooks/              # 自訂 Hook 邏輯
│   │   └── useAssistant.js   # 核心對話管理、打字機動效與本機保存
│   ├── services/           # API 整合
│   │   └── api.client.js     # 後端連線、錯誤解析與 x-user-id Header 注入
│   ├── views/              # 畫面層
│   │   └── AssistantView.jsx # 智慧對話主畫面
│   ├── App.css             # 全域與元件核心樣式
│   ├── App.jsx             # 根元件與路由配置
│   └── main.jsx            # 應用程式進入點
├── .env.example            # 前端環境變數範本
├── Dockerfile              # 容器化建置設定
├── package.json            # 專案依賴與腳本定義
└── vite.config.js          # Vite 配置 (包含 API 反向代理 Proxy)
```

---

## ⚙️ 環境變數設定

請複製 `.env.example` 為 `.env` 並根據開發或部署環境調整：

```bash
cp .env.example .env
```

| 變數名稱 | 說明 | 預設值 / 建議範例 |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | 後端 API 基礎路徑。<br>- 本地開發搭配 Vite Proxy 建議設為 `/api/v1`<br>- 正式獨立網域可填入完整 URL（如 `https://insurancebackend.zeabur.app/api/v1`） | `/api/v1` |
| `VITE_API_PROXY_TARGET` | 本地開發時 Vite Proxy 轉發目標伺服器。<br>- 本地後端：`http://localhost:3000`<br>- 遠端測試機：`https://insurancebackend.zeabur.app` | `https://insurancebackend.zeabur.app` |
| `VITE_USER_ID` | 模擬使用者 UUID（透過 `x-user-id` Header 傳送至後端驗證） | `00000000-0000-0000-0000-000000000001` |
| `VITE_PORT` | 本地開發伺服器埠號 | `5173` |

---

## 🚀 快速開始

### 1. 安裝相依套件

```bash
npm install
```

### 2. 本地開發模式

啟動 Vite 開發伺服器（預設監聽 `http://localhost:5173`）：

```bash
npm run dev
```

### 3. 程式碼靜態檢查

執行 Oxlint 檢查專案程式碼：

```bash
npm run lint
```

### 4. 正式版本建置與本地預覽

```bash
# 編譯打包輸出至 dist/ 目錄
npm run build

# 預覽打包產物
npm run preview
```

---

## 🐳 Docker 容器化與部署

本專案支援容器化打包，並針對 **GCP Cloud Run** 或其他容器平台進行了最佳化：

### 容器運行機制
- **啟動時編譯（Runtime Build）**：容器啟動時執行 `npm run build`，確保 Cloud Run 在運行階段注入的環境變數（如 `VITE_API_BASE_URL`）能正確編譯進前端靜態資源中。
- **SPA 靜態服務**：使用 `serve -s dist -l $PORT` 提供單頁應用（SPA）路由回退支援。

### 本地 Docker 測試

```bash
# 建置 Docker 映像檔
docker build -t insurance-frontend:latest .

# 運行容器（預設映射本機 8080 埠）
docker run -p 8080:8080 -e PORT=8080 insurance-frontend:latest
```

### GCP Cloud Run 部署範例

```bash
gcloud run deploy insurance-web-server \
  --image asia-east1-docker.pkg.dev/YOUR_PROJECT/insurance-repo/web-server:latest \
  --region asia-east1 \
  --set-env-vars="VITE_API_BASE_URL=https://api.yourdomain.com/api/v1"
```

---

## 🔗 相關連結

- [專案總覽文件 (Root README)](../README.md)
- [前端開發規範文件 (spec/devPrincipal/03-frontend.md)](../spec/devPrincipal/03-frontend.md)
- [後端 API 設計規格 (spec/APIDesign/v1.md)](../spec/APIDesign/v1.md)
