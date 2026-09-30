# 🛡️ 保險智慧助理 (Insurance Assistance)

基於 Nuxt 4、TypeScript 與意圖辨識 AI (Intent Classification AI) 的智慧保險助理系統。系統透過自然語言理解使用者需求，結合身分驗證與業務服務，提供即時保單查詢、理賠文件指引與線上理賠流程導引。

---

## 📑 目錄

- [專案簡介](#-專案簡介)
- [核心功能 (v1)](#-核心功能-v1)
- [系統架構與技術棧](#-系統架構與技術棧)
- [API 設計與工作流程](#-api-設計與工作流程)
  - [1. 查詢使用者保單 (list_user_policies)](#1-查詢使用者保單-list_user_policies)
  - [2. 查詢理賠所需文件 (claim_required_documents)](#2-查詢理賠所需文件-claim_required_documents)
  - [3. 導引理賠申請 (start_claim)](#3-導引理賠申請-start_claim)
- [資料庫實體模型 (Data Model)](#-資料庫實體模型-data-model)
- [專案結構](#-專案結構)
- [快速開始](#-快速開始)
- [相關規格文件](#-相關規格文件)

---

## 💡 專案簡介

傳統保險服務常因保單條款繁複、理賠流程冗長而造成保戶困擾。「保險智慧助理」旨在提供直覺、安全且結構化的交談式體驗：
- **意圖分類**：精準理解使用者自然語言提問（例如「我目前有幾張保單？」、「住院需要準備什麼？」）。
- **安全驗證**：透過 [Better Auth](https://better-auth.com/) 進行 Session 授權驗證，確保個人保單資料不外洩。
- **模板化回應**：AI 僅負責意圖判定與參數解析，資料查詢與回答皆經由業務層 (Service Layer) 與回應模板 (Response Template) 輸出，確保金融資訊精確無誤。
- **動態行為導航**：支援 Action Response，後端可指揮前端 Router 自動導航至理賠申請頁面。

---

## 🚀 核心功能 (v1)

| 意圖名稱 (Intent) | 觸發範例 | 說明 |
| :--- | :--- | :--- |
| `list_user_policies` | 「我目前有幾張保單？」、「查看我的保險」 | 查詢當前登入使用者的所有有效保單狀態與明細。 |
| `claim_required_documents` | 「住院理賠需要準備什麼文件？」、「車禍理賠要帶什麼？」 | 根據使用者持有的保單類型與出險情境，列出需檢附的理賠文件清單。 |
| `start_claim` | 「我要申請理賠」、「幫我申請理賠」 | 檢查使用者名下可申請之保單，回傳導航 Action 引導進入線上理賠申請表單。 |

---

## 🏗️ 系統架構與技術棧

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Nuxt 4 / Vue 3)                 │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼───────────────────────────────┐
│                 Backend (Node.js / TypeScript)                │
│                                                              │
│  ┌─────────────┐   ┌───────────────────────┐   ┌───────────┐ │
│  │ Better Auth │   │  Intent AI Classifier │   │   Router  │ │
│  └─────────────┘   └───────────────────────┘   └─────┬─────┘ │
│                                                      │       │
│  ┌───────────────────────────────────────────────────▼────┐  │
│  │ Service Layer (UserPolicyService / ClaimService)       │  │
│  └───────────────────────────┬────────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────▼────────────────────────────┐  │
│  │ Repository Layer (UserInsuranceRepo / ClaimRepo)       │  │
│  └───────────────────────────┬────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────┘
                               │ SQL
┌──────────────────────────────▼───────────────────────────────┐
│                     Database (PostgreSQL)                    │
└──────────────────────────────────────────────────────────────┘
```

- **Frontend**：Nuxt 4 / Vue 3，提供交談介面與動態 Router Navigation
- **Backend**：TypeScript，負責 API 路由、業務邏輯與流程編排
- **Authentication**：Better Auth，處理 Session 驗證並取得 `userId`
- **AI Engine**：Intent Classification AI，負責理解使用者對話並分類意圖
- **Response Engine**：Response Template / Action Template，輸出固定格式 JSON 或前端 Action 指令
- **Database**：PostgreSQL，儲存使用者保單與理賠規則關聯資料

---

## 📡 API 設計與工作流程

詳細時序圖請參閱 [spec/API_design/v1.md](spec/API_design/v1.md)。

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
1. 經由 Better Auth 驗證使用者 Session，取出 `userId`。
2. 將訊息傳入 **Intent Classification AI** 判定意圖。
3. **Intent Router** 根據意圖分流呼叫對應內部服務。

---

### 1. 查詢使用者保單 (`list_user_policies`)

- **內部路由**：`GET /users/me/policies`
- **業務元件**：`UserPolicyService` ➔ `UserInsuranceRepository`
- **資料查詢**：查詢 `user_insurance JOIN insurance`
- **回覆方式**：套用保單查詢模板 (Policy Template)
- **Response 範例**：
  ```json
  {
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
  ```

---

### 2. 查詢理賠所需文件 (`claim_required_documents`)

- **內部路由**：`GET /claims/requirements?type={claimType}`
- **業務元件**：`ClaimService` ➔ `UserInsuranceRepository` & `ClaimRequirementRepository`
- **資料查詢**：確認使用者有效保單，比對 `claim_requirements` 規則資料表
- **回覆方式**：套用理賠文件模板 (Claim Requirement Template)
- **Response 範例**：
  ```json
  {
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
  ```

---

### 3. 導引理賠申請 (`start_claim`)

- **內部路由**：`POST /claims/start`
- **業務元件**：`ClaimService` ➔ `UserInsuranceRepository`
- **資料查詢**：查詢使用者名下可申請理賠之保單清單
- **回覆方式**：套用動作模板 (Action Template)，回傳帶有前端路由導向的指令
- **Response 範例**：
  ```json
  {
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
  ```
- **前端行為**：前端監聽到 `NAVIGATE` Action 後，自動調用 Vue Router 前往 `/claims/apply`。

---

## 🗄️ 資料庫實體模型 (Data Model)

系統核心使用 PostgreSQL，主要資料表概念如下：

```mermaid
erDiagram
    users ||--o{ user_insurance : owns
    insurance ||--o{ user_insurance : includes
    insurance ||--o{ claim_requirements : defines

    users {
        uuid id PK
        string email
        string name
        timestamp created_at
    }

    insurance {
        string id PK
        string code
        string name
        string type
        text description
    }

    user_insurance {
        uuid id PK
        uuid user_id FK
        string insurance_id FK
        string policy_number
        string status
        date start_date
        date end_date
    }

    claim_requirements {
        uuid id PK
        string insurance_id FK
        string claim_type
        jsonb required_documents
        text notes
    }
```

---

## 📂 專案結構

```
insuranceAssistance/
├── backend/            # 後端服務 (TypeScript)
│   ├── src/
│   │   ├── controllers/# API Controllers (assistant, policy, claims)
│   │   ├── services/   # 商業邏輯 (UserPolicyService, ClaimService)
│   │   ├── repositories/# 資料庫存取層 (PostgreSQL)
│   │   ├── templates/  # 回應與動作模板 (Response & Action Templates)
│   │   ├── ai/         # 意圖分類器 (Intent Classifier & Router)
│   │   └── auth/       # Better Auth 驗證設定
│   └── package.json
├── frontend/           # 前端應用 (Nuxt 4 / Vue 3)
│   ├── pages/          # 頁面路由 (對話介面、理賠申請頁面等)
│   ├── components/     # Vue 元件 (助理對話泡泡、卡片)
│   ├── composables/    # 狀態與 API 呼叫封裝
│   └── nuxt.config.ts
├── spec/               # 設計規格文件
│   └── API_design/
│       └── v1.md       # v1 API 設計與 Sequence Diagram
└── README.md           # 專案總覽文件
```

---

## 🛠️ 快速開始

### 環境需求
- Node.js >= 20.x
- pnpm 或 npm / yarn
- PostgreSQL >= 15

### 環境變數設定

在 `backend/.env` 配置必要參數：
```env
DATABASE_URL="postgresql://user:password@localhost:5432/insurance_db"
BETTER_AUTH_SECRET="your-better-auth-secret"
BETTER_AUTH_URL="http://localhost:3000"
AI_API_KEY="your-llm-api-key"
```

---

## 📖 相關規格文件

- [API 設計規格 (v1)](spec/API_design/v1.md)
