# 🛡️ 保險智慧助理 (Insurance Assistance)

基於 **React** (Web Server)、**Express + TypeScript 三層式架構** (AP Server)、**Drizzle ORM**、**MySQL 8.0+** 與意圖辨識 AI (Vercel AI SDK) 的智慧保險助理系統。系統透過自然語言理解使用者需求，結合身分驗證與業務服務，提供即時保單查詢、理賠文件指引與線上理賠流程導引，前後端各自獨立容器化部署於 **GCP Cloud Run**。

---

## 📑 目錄

- [專案簡介](#-專案簡介)
- [核心功能 (v1)](#-核心功能-v1)
- [系統架構與技術棧](#-系統架構與技術棧)
  - [前後端與部署拓撲](#前後端與部署拓撲)
  - [後端三層式架構](#後端三層式架構)
- [API 設計與工作流程](#-api-設計與工作流程)
  - [1. 查詢使用者保單 (list_user_policies)](#1-查詢使用者保單-list_user_policies)
  - [2. 查詢理賠所需文件 (claim_required_documents)](#2-查詢理賠所需文件-claim_required_documents)
  - [3. 導引理賠申請 (start_claim)](#3-導引理賠申請-start_claim)
- [資料庫實體模型與版控 (MySQL)](#-資料庫實體模型與版控-mysql)
- [專案目錄結構](#-專案目錄結構)
- [快速開始](#-快速開始)
  - [本機開發與測試](#1-啟動本機-mysql-資料庫)
  - [GCP Cloud Run 雲端部署](#3-️-gcp-cloud-run-雲端部署)
- [AI 意圖評估與量化驗證 (Evaluation)](#-ai-意圖評估與量化驗證-intent-classifier-evaluation)
- [相關規格與開發準則文件](#-相關規格與開發準則文件)

---

## 💡 專案簡介

傳統保險服務常因保單條款繁複、理賠流程冗長而造成保戶困擾。「保險智慧助理」旨在提供直覺、安全且結構化的交談式體驗：

- **意圖分類**：精準理解使用者自然語言提問（例如「我目前有幾張保單？」、「住院需要準備什麼？」）。
- **身分驗證與安全授權**：支援 Bearer Token 或使用者標頭 (`x-user-id`) 進行身分識別與上下文注入，確保個人保單資料安全。
- **模板化回應**：AI 僅負責意圖判定與參數解析，資料查詢與回答皆經由業務層 (Service Layer) 與回應模板 (Response Template) 輸出，確保金融資訊精確無誤。
- **動態行為導航**：支援 Action Response，後端可指揮前端 Router 自動導航至理賠申請頁面。
- **雲原生雙服務架構**：前端（Web Server）與後端（AP Server）完全解耦，各自作為獨立微服務部署於 GCP Cloud Run，支援 Cloud SQL Unix Socket 與 Secret Manager 整合。

---

## 🚀 核心功能 (v1)

| 功能模組 / 意圖名稱       | 觸發範例 / 操作方式                                   | 說明                                                                   |
| :------------------------- | :----------------------------------------------------- | :--------------------------------------------------------------------- |
| `list_user_policies`       | 「我目前有幾張保單？」、「查看我的保險」               | 查詢當前登入使用者的所有有效保單狀態與明細。                           |
| `claim_required_documents` | 「住院理賠需要準備什麼文件？」、「車禍理賠要帶什麼？」 | 根據使用者持有的保單類型與出險情境，列出需檢附的理賠文件清單。         |
| `start_claim`              | 「我要申請理賠」、「幫我申請理賠」                     | 檢查使用者名下可申請之保單，回傳導航 Action 引導進入線上理賠申請表單。 |

---

## 🏗️ 系統架構與技術棧

### 前後端與部署拓撲

前後端完全分離，各自獨立打包容器鏡像並部署至 **GCP Cloud Run**：

```
                              使用者瀏覽器 (Client)
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            │ HTTPS (靜態資源與 SPA 頁面)                          │ HTTPS (RESTful API / OAuth Callback)
            ▼                                                     ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│  Web Server (Frontend)       │              │  AP Server (Backend)         │
│  - React + Vite + TypeScript │              │  - Node.js + Express (TS)    │
│  - Nginx Alpine Container    │              │  - 三層式架構 (Controller/   │
│  - GCP Cloud Run (Service 1) │              │    Service/Repository)       │
│  - Port 80                   │              │  - GCP Cloud Run (Service 2) │
└──────────────────────────────┘              │  - Port 8080 (Trust Proxy)   │
                                               └──────────────┬───────────────┘
                                                              │
                                      ┌───────────────────────┼───────────────────────┐
                                      │ Unix Socket / TCP     │ IAM / Vertex AI       │ Secret
                                      ▼                       ▼                       ▼
                          ┌───────────────────────┐ ┌──────────────────┐ ┌──────────────────┐
                          │ GCP Cloud SQL (MySQL) │ │ Google Vertex AI │ │  Secret Manager  │
                          │ (Auth + Insurance DB) │ │ (Gemini 2.0 LLM) │ │ (Keys & Passwords)│
                          └───────────────────────┘ └──────────────────┘ └──────────────────┘
```

- **Frontend (Web Server)**：React + Vite + Zustand + React Router + TypeScript，以 Nginx 容器託管並部署於 GCP Cloud Run。
- **Backend (AP Server)**：Node.js + Express + TypeScript，採用嚴格三層式架構，套件管理統一使用 **pnpm**，啟用 Trust Proxy 適配 GCP 負載平衡。
- **ORM & Data Access**：Drizzle ORM (`drizzle-orm`, `mysql2`)，透過 Type-Safe Query Builder 自動編譯 Prepared Statements，徹底防禦 SQL Injection。
- **Database**：MySQL 8.0+（支援本地端與 GCP Cloud SQL Unix Socket 雙模連線），包含核心業務資料表（保險商品、使用者保單及理賠文件規範）。
- **Authentication**：支援 Bearer Token (`Authorization: Bearer <token>`) 或使用者標頭 (`x-user-id`) 認證與上下文注入。
- **AI Engine**：Intent Classification AI（支援 Google Cloud Vertex AI 或 Google AI Studio Gemini 模型），負責理解使用者對話並分類意圖。
- **Deployment & Cloud**：GCP Cloud Run + GCP Cloud SQL (MySQL) + GCP Secret Manager。

### 後端三層式架構

後端 AP Server 嚴格遵守 Controller - Service - Repository 分層規範：

```
┌──────────────────────────────────────────────────────────────┐
│               1. 表現層 (Controller Layer)                   │
│   - Express Router / Controllers (Assistant, Policy, Claims) │
│   - 職責：HTTP 路由分發、Zod 輸入驗證、身分認證中介層         │
└──────────────────────────────┬───────────────────────────────┘
                               │ 調用 Service (DTO / Context)
┌──────────────────────────────▼───────────────────────────────┐
│               2. 商業邏輯層 (Service Layer)                  │
│   - UserPolicyService / ClaimService / IntentRouter          │
│   - 職責：商業規則計算、AI 意圖調度、事務管理、模板渲染       │
└──────────────────────────────┬───────────────────────────────┘
                               │ 調用 Repository (Type-Safe Query Builder)
┌──────────────────────────────▼───────────────────────────────┐
│               3. 資料存取層 (Repository Layer)               │
│   - UserInsuranceRepository / ClaimRequirementRepository     │
│   - 職責：Drizzle ORM 查詢封裝 (自動參數化防 SQL 注入)、連線池 │
└──────────────────────────────┬───────────────────────────────┘
                               │ Prepared Statements (MySQL 8.0+)
┌──────────────────────────────▼───────────────────────────────┐
│                     Database (MySQL 8.0+)                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📡 API 設計與工作流程

詳細時序圖請參閱 [spec/APIDesign/v1.md](spec/APIDesign/v1.md)。

### 對話主入口 (Assistant Endpoint)

```http
POST /assistant/message
```

**Request Payload:**

```json
{
  "message": "我目前有幾張保單？"
}
```

後端處理流程：

1. 經由認證中介層 (`requireAuth`) 驗證使用者標頭或憑證，取出 `userId`。
2. 將訊息傳入 **Intent Classification AI** 判定意圖。
3. **Intent Router** 根據意圖分流呼叫對應內部服務（Controller ➔ Service ➔ Repository）。

---

### 1. 查詢使用者保單 (`list_user_policies`)

- **內部路由**：`GET /users/me/policies`
- **業務元件**：`PolicyController` ➔ `UserPolicyService` ➔ `UserInsuranceRepository`
- **資料查詢**：查詢 `user_insurance JOIN insurance` (MySQL)
- **回覆方式**：套用保單查詢模板 (Policy Template)
- **Response 範例**：
  ```json
  {
    "success": true,
    "data": {
      "type": "text",
      "intent": "list_user_policies",
      "content": "您目前共有 3 張有效保單：\n1. 安心終身壽險 (有效)\n2. 守護醫療健康保險 (有效)\n3. 意外傷害保障 (有效)",
      "data": {
        "totalPolicies": 3,
        "policies": [
          { "id": "POL-001", "name": "安心終身壽險", "status": "ACTIVE" },
          { "id": "POL-002", "name": "守護醫療健康保險", "status": "ACTIVE" },
          { "id": "POL-003", "name": "意外傷害保障", "status": "ACTIVE" }
        ]
      }
    }
  }
  ```

---

### 2. 查詢理賠所需文件 (`claim_required_documents`)

- **內部路由**：`GET /claims/requirements?type={claimType}`
- **業務元件**：`ClaimController` ➔ `ClaimService` ➔ `UserInsuranceRepository` & `ClaimRequirementRepository`
- **資料查詢**：比對使用者有效保單與 `claim_requirements` 資料表
- **回覆方式**：套用理賠文件模板 (Claim Requirement Template)
- **Response 範例**：
  ```json
  {
    "success": true,
    "data": {
      "type": "text",
      "intent": "claim_required_documents",
      "content": "為您查詢住院理賠所需準備文件清單如下：\n- 醫療診斷證明書（正本）\n- 醫療費用收據與明細表\n- 保險理賠申請書\n- 被保險人身分證明文件與存摺封面影本",
      "data": {
        "claimType": "hospitalization",
        "requiredDocuments": [
          { "name": "醫療診斷證明書", "isOriginalRequired": true },
          { "name": "醫療費用收據與明細表", "isOriginalRequired": true },
          { "name": "保險理賠申請書", "isOriginalRequired": false },
          { "name": "身分證正反面影本及存摺封面", "isOriginalRequired": false }
        ]
      }
    }
  }
  ```

---

### 3. 導引理賠申請 (`start_claim`)

- **內部路由**：`POST /claims/start`
- **業務元件**：`ClaimController` ➔ `ClaimService` ➔ `UserInsuranceRepository`
- **資料查詢**：查詢使用者名下可申請理賠之保單清單
- **回覆方式**：套用動作模板 (Action Template)，回傳帶有前端路由導向的指令
- **Response 範例**：
  ```json
  {
    "success": true,
    "data": {
      "type": "action",
      "intent": "start_claim",
      "action": "NAVIGATE",
      "payload": {
        "route": "/claims/apply",
        "params": {
          "availablePolicyIds": ["POL-001", "POL-002"]
        }
      },
      "message": "已為您準備好理賠申請流程，即將開啟申請頁面..."
    }
  }
  ```
- **前端行為**：前端 React 應用監聽到 `NAVIGATE` Action 後，調用 React Router 自動導航至 `/claims/apply`。

---

## 🗄️ 資料庫實體模型與版控 (MySQL)

系統核心使用 MySQL 8.0+ (InnoDB)，所有 DDL 與 DML 腳本皆在 `db/` 目錄下進行嚴格版本控制：

```mermaid
erDiagram
    users ||--o{ user_insurance : owns
    insurance ||--o{ user_insurance : includes
    insurance ||--o{ claim_requirements : defines

    users {
        char(36) id PK
        varchar(255) email
        varchar(100) name
        timestamp created_at
        timestamp updated_at
    }

    insurance {
        varchar(50) id PK
        varchar(50) code UK
        varchar(100) name
        varchar(50) type
        text description
        timestamp created_at
        timestamp updated_at
    }

    user_insurance {
        char(36) id PK
        char(36) user_id FK
        varchar(50) insurance_id FK
        varchar(100) policy_number UK
        varchar(20) status
        date start_date
        date end_date
        timestamp created_at
        timestamp updated_at
    }

    claim_requirements {
        char(36) id PK
        varchar(50) insurance_id FK
        varchar(50) claim_type
        json required_documents
        text notes
        timestamp created_at
        timestamp updated_at
    }
```

- 結構定義 (DDL)：收錄於 `db/ddl/`
  - `V001__create_initial_schema.sql`：核心業務資料表（使用者、保險商品、保單關聯、理賠文件規範）
- 種子資料 (DML)：收錄於 `db/dml/`（如 `V001__seed_initial_data.sql`）
- 執行說明請參閱 [db/README.md](db/README.md)。

---

## 📂 專案目錄結構

```
insuranceAssistance/
├── backend/                  # 後端 AP Server (Express / TypeScript / Drizzle)
│   ├── src/
│   │   ├── config/           # 環境變數載入與驗證 (env.ts)
│   │   ├── db/               # Drizzle ORM 連線與 Schema 定義
│   │   │   ├── index.ts      # 資料庫連線實例 (drizzle client)
│   │   │   └── schema/       # 資料表綱要 (users, insurance, user-insurance...)
│   │   ├── routes/           # Express 路由模組層
│   │   ├── controllers/      # 表現層 Controller (assistant, policy, claims)
│   │   ├── services/         # 商業邏輯層 Service (UserPolicyService, ClaimService)
│   │   ├── repositories/     # 資料存取層 Repository (Drizzle ORM 防注入)
│   │   ├── templates/        # 回應與動作模板 (Response & Action Templates)
│   │   ├── ai/               # 意圖分類器 (Vercel AI SDK) 與路由器 (Intent Router)
│   │   │   └── prompts/      # 版本化 System Prompts (V1, V2)
│   │   ├── middlewares/      # 身分認證 (requireAuth)、Zod 驗證與全域錯誤攔截
│   │   ├── models/           # DTO 型別定義
│   │   ├── utils/            # AppError, ApiResponse, Logger
│   │   ├── app.ts            # Express 應用設定與中介層掛載
│   │   └── index.ts          # 伺服器啟動與優雅關機
│   ├── evaluation/           # 獨立 AI 意圖評估框架 (純函式量化評估)
│   │   ├── datasets/         # 125 筆人工標註多樣性資料集 (intent-test-cases.json)
│   │   ├── types.ts          # 評估資料模型與型別定義
│   │   ├── metrics.ts        # Precision/Recall/F1/Confusion Matrix 計算模組
│   │   ├── evaluate.ts       # CLI 執行工具 (支援多輪穩定性、抽樣與 A/B 測試)
│   │   └── results/          # 自動匯出報表 (latest-summary.md, csv, json)
│   ├── tests/                # 單元測試與整合測試
│   ├── drizzle.config.ts     # Drizzle Kit 設定檔
│   ├── Dockerfile            # AP Server Multi-stage Dockerfile
│   ├── package.json
│   ├── pnpm-lock.yaml        # pnpm 依賴鎖定檔
│   └── tsconfig.json
├── frontend/                 # 前端 Web Server (React / Vite)
│   ├── src/
│   │   ├── components/       # 對話介面與卡片元件
│   │   ├── views/            # SPA 頁面 (助理對話、理賠申請)
│   │   ├── hooks/            # 自訂 Hooks (對話與狀態處理)
│   │   ├── stores/           # Zustand 狀態管理
│   │   ├── router/           # React Router 配置 (NAVIGATE Action 接收端)
│   │   └── services/         # AP Server API 客戶端
│   ├── nginx.conf            # Web Server 容器 Nginx 設定 (SPA fallback)
│   ├── Dockerfile            # Web Server Multi-stage Dockerfile
│   ├── package.json
│   ├── pnpm-lock.yaml        # pnpm 依賴鎖定檔
│   └── vite.config.ts
├── db/                       # 資料庫版本控制
│   ├── ddl/                  # Schema 定義腳本 (V001__create_initial_schema.sql)
│   ├── dml/                  # 種子資料腳本 (V001__seed_initial_data.sql)
│   └── README.md             # 資料庫初始化指南
├── spec/                     # 設計規格與開發準則
│   ├── devPrincipal/         # 團隊開發準則庫
│   │   ├── README.md         # 開發準則總覽
│   │   ├── 01-architecture.md# 系統與三層式架構規範
│   │   ├── 02-backend.md     # 後端規範 (TypeScript, Express & Drizzle ORM)
│   │   ├── 03-frontend.md    # 前端規範 (React)
│   │   ├── 04-database.md    # 資料庫設計與版控規範 (MySQL)
│   │   ├── 05-deployment.md  # 容器化與 GCP Cloud Run 部署規範
│   │   └── evaluation.md     # AI 意圖評估框架設計與驗證規範
│   └── APIDesign/
│       └── v1.md             # v1 API 時序圖規格
└── README.md                 # 專案總覽文件
```

---

## 🛠️ 快速開始

### 環境需求

- **Node.js** >= 20.10.0 LTS
- **pnpm** >= 9.x（`corepack enable && corepack prepare pnpm@latest --activate`）
- **MySQL** >= 8.0（或 Docker）

### 1. 啟動本機 MySQL 資料庫

```bash
docker run --name insurance-mysql \
  -e MYSQL_ROOT_PASSWORD=rootsecret \
  -e MYSQL_DATABASE=insurance_db \
  -e MYSQL_USER=app_backend \
  -e MYSQL_PASSWORD=app_secret \
  -p 3306:3306 \
  -d mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci

# 匯入 DDL 與 DML
mysql -h 127.0.0.1 -P 3306 -u app_backend -papp_secret insurance_db < db/ddl/V001__create_initial_schema.sql
mysql -h 127.0.0.1 -P 3306 -u app_backend -papp_secret insurance_db < db/dml/V001__seed_initial_data.sql
```

### 2. 啟動後端 AP Server

```bash
cd backend
pnpm install
pnpm dev
# 若有 Schema 異動可執行：pnpm db:generate
```

後端啟動後可開啟 Swagger UI 查看與測試 API：
- **Swagger UI 介面**：`http://localhost:3000/api-docs` (或 `8080`)
- **OpenAPI JSON 規格**：`http://localhost:3000/api-docs.json`

後端本機環境變數設定檔 (`backend/.env`)：

```env
# 資料庫連線：本機使用 DATABASE_URL，GCP 支援 DB_SOCKET_PATH
DATABASE_URL=mysql://app_backend:app_secret@127.0.0.1:3306/insurance_db
PORT=3000
CORS_ORIGIN=http://localhost:5173

# AI 意圖分析（支援 Vertex AI 或 Google AI Studio）
AI_PROVIDER=google-vertex
AI_MODEL=gemini-2.0-flash
GOOGLE_VERTEX_PROJECT=insurance-assistance-project
GOOGLE_VERTEX_LOCATION=asia-east1
```

### 3. 啟動前端 Web Server

```bash
cd frontend
pnpm install
pnpm dev
```

前端環境變數設定檔 (`frontend/.env`)：

```env
VITE_API_BASE_URL="http://localhost:3000"
```

### 4. ☁️ GCP Cloud Run 雲端部署

系統原生支援前後端雙服務部署於 **GCP Cloud Run**，並透過 **GCP Secret Manager** 管理機敏憑證：

#### 步驟 1：部署後端 AP Server 至 Cloud Run
```bash
gcloud run deploy insurance-ap-server \
  --image asia-east1-docker.pkg.dev/YOUR_PROJECT/insurance-repo/ap-server:latest \
  --region asia-east1 \
  --set-env-vars="AI_PROVIDER=google-vertex,AI_MODEL=gemini-2.0-flash,GOOGLE_VERTEX_LOCATION=asia-east1,CORS_ORIGIN=https://insurance.yourdomain.com,DB_SOCKET_PATH=/cloudsql/YOUR_PROJECT:asia-east1:insurance-mysql,DB_USER=app_backend,DB_NAME=insurance_db" \
  --set-secrets="DB_PASSWORD=DB_PASSWORD:latest" \
  --add-cloudsql-instances="YOUR_PROJECT:asia-east1:insurance-mysql"
```

#### 步驟 2：部署前端 Web Server 至 Cloud Run
```bash
gcloud run deploy insurance-web-server \
  --image asia-east1-docker.pkg.dev/YOUR_PROJECT/insurance-repo/web-server:latest \
  --region asia-east1 \
  --set-env-vars="VITE_API_BASE_URL=https://api.yourdomain.com"
```

---

## 🧪 AI 意圖評估與量化驗證 (Intent Classifier Evaluation)

為了確保 Gemini 模型在自然語言理解時的準確率與穩定性，本專案建立了一套**獨立、純函式型態的意圖評估框架**（位於 `backend/evaluation/`）。該框架完全解耦 Express API、資料庫與外部業務邏輯，專注於量化評估 AI 意圖識別效能。

### 核心特性
- **獨立純函式評估**：直接呼叫 `VercelIntentClassifier.classify(text)`，完全不啟動 HTTP 伺服器或存取資料庫。
- **125 筆真實多樣性標註資料集 (`intent-test-cases.json`)**：平衡涵蓋 5 大生產意圖（`list_user_policies`、`claim_required_documents`、`start_claim`、`redirect_to_human`、`unknown`），刻意納入標準句、極短句（如「我要賠」）、口語同音錯字（如「保但」）、邊界易混淆句與離題問候。
- **全方位量化指標**：
  - **Confusion Matrix（混淆矩陣）**：分析意圖之間的混淆邊界。
  - **Precision、Recall、F1-Score**：細分各類別表現，並計算 Macro Average 與 Weighted Average。
  - **次分類準確率 (ClaimType)**：評估理賠文件細項（住院 / 意外 / 手術）的提取正確度。
  - **多輪穩定度一致率 (Multi-run Stability)**：針對同一個測試語句連續執行多次，量化生成式模型的一致性。
- **Prompt A/B 測試支援**：透過版本化 System Prompt，成功發現 V1 因文字定義重疊使 `unknown` 誤判為 `redirect_to_human`，改進至 V2 後實測準確率提升至 **100.0%**。

### 常用評估指令 (`backend/`)

```bash
# 1. 執行標準評估（全量 125 筆資料集）
pnpm eval:intent

# 2. 分層抽樣快速驗證（抽取各類別平均共 20 筆）
pnpm eval:intent --limit 20

# 3. 多輪模型推論穩定度評估（每個 Case 重複測試 3 次）
pnpm eval:intent:stability --limit 10

# 4. 指定 Prompt 版本進行 A/B 測試
pnpm eval:intent --prompt v1 --limit 10
pnpm eval:intent --prompt v2 --limit 10
```

每次執行完畢後，報表將自動輸出至 `backend/evaluation/results/`：
- `latest-summary.md`：包含指標表格、混淆矩陣與錯誤案例清單 (Bad Cases) 的 Markdown 總覽。
- `latest-confusion-matrix.csv`：混淆矩陣 CSV 檔，方便匯入試算表製圖。
- `latest-result.json`：結構化評估結果原始資料。

---

## 📖 相關規格與開發準則文件

- **開發準則 (spec/devPrincipal)**：
  - [開發準則總覽](spec/devPrincipal/README.md)
  - [01. 系統架構與三層式設計準則](spec/devPrincipal/01-architecture.md)
  - [02. 後端開發規範 (TypeScript, Express & Drizzle ORM)](spec/devPrincipal/02-backend.md)
  - [03. 前端開發規範 (React)](spec/devPrincipal/03-frontend.md)
  - [04. 資料庫設計與版控規範 (MySQL & db/)](spec/devPrincipal/04-database.md)
  - [05. 容器化與 GCP Cloud Run 部署規範](spec/devPrincipal/05-deployment.md)
  - [06. AI 意圖評估框架與驗證準則](spec/devPrincipal/evaluation.md)
- **資料庫管理 (db)**：
  - [資料庫結構與種子資料指南](db/README.md)
- **API 設計規格**：
  - [API 設計規格 (v1)](spec/APIDesign/v1.md)
