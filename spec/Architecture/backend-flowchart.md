# 後端 POST /assistant/message 流向資料庫流程圖 (Backend Flowchart)

本文件描述 **`POST /api/v1/assistant/message`** 請求自發起到進入資料庫的完整生命週期。涵蓋中介軟體、身份認證、控制器、AI 意圖識別分析，展開 **5 大意圖分支（All Intents）**，並展示如何透過 Repository 與 Drizzle ORM 最終打入資料庫（MySQL 8.0）終點。

---

## 1. 核心流程圖 (Mermaid Flowchart)

```mermaid
flowchart LR
    %% 1. 用戶端請求
    Client(["用戶端 / 前端 SPA 發起<br/>POST /api/v1/assistant/message"])  --> GeminiCall

    GeminiCall["IntentClassifier<br/>(呼叫 Google Gemini API 模型)"]

    %% 6. 所有 5 種意圖分支 (All Intents)
    GeminiCall --> IntentBranch{"判斷 classification.intent<br/>(5 大意圖分支)"}

    IntentBranch -->|"1. list_user_policies<br/>(查詢個人保單)"| Svc_Policy["UserPolicyService"]
    IntentBranch -->|"2. claim_required_documents<br/>(查詢理賠文件)"| Svc_ClaimDocs["ClaimService"]
    IntentBranch -->|"3. start_claim<br/>(發起理賠引導)"| Svc_ClaimStart(["redirectToHumanResponse<br/>(導引至理賠申請單下載頁面)"])
    IntentBranch -->|"4. redirect_to_human<br/>(專人客服導引)"| EndHuman(["redirectToHumanResponse<br/>(導引至專人回覆頁面)"])
    IntentBranch -->|"5. unknown<br/>(未知意圖提示)"| EndUnknown(["unknownResponse<br/>(提示使用者可以詢問的事項)"])

    %% 7. 資料存取層
    subgraph RepoTier ["資料存取層 (Repository Layer)"]
        direction TB
        Repo_UserIns["UserInsuranceRepository"]
        Repo_ClaimReq["ClaimRequirementRepository"]
    end

    Svc_Policy -->|"查詢持有之有效保單"| Repo_UserIns
    Svc_ClaimDocs -->|"第一步：查詢使用者持有之保單"| Repo_UserIns
    Svc_ClaimDocs -->|"第二步：依 insuranceId 與 claimType 撈取文件"| Repo_ClaimReq


    %% 9. 流程終點：資料庫
    Repo_UserIns--> DB[("MySQL資料庫")]
    Repo_ClaimReq--> DB

    %% 樣式設定
    classDef client fill:#E1F5FE,stroke:#0288D1,stroke-width:2px,color:#01579B;
    classDef mw fill:#FFF8E1,stroke:#FFA000,stroke-width:1.5px,color:#E65100;
    classDef ctrl fill:#EDE7F6,stroke:#7E57C2,stroke-width:1.5px,color:#311B92;
    classDef ai fill:#E8F5E9,stroke:#43A047,stroke-width:1.5px,color:#1B5E20;
    classDef branch fill:#FFE0B2,stroke:#FB8C00,stroke-width:2px,color:#E65100;
    classDef repo fill:#E0F7FA,stroke:#00ACC1,stroke-width:1.5px,color:#006064;
    classDef noDb fill:#F5F5F5,stroke:#9E9E9E,stroke-width:1.5px,color:#616161,stroke-dasharray: 5 5;
    classDef db fill:#ECEFF1,stroke:#37474F,stroke-width:3px,color:#212121;

    class Client,LB,AP client;
    class MW_Helmet,MW_CORS,MW_Body,MW_Log,AssistantRoute,AuthMW,ZodCheck mw;
    class Ctrl_Assistant ctrl;
    class Svc_Assistant,GeminiCall,RouterCall,Svc_Policy,Svc_ClaimDocs ai;
    class IntentBranch branch;
    class Repo_UserIns,Repo_ClaimReq,Drizzle,Pool repo;
    class EndHuman,EndUnknown,Svc_ClaimStart noDb;
    class DB db;
```

---

## 2. 5 大意圖分支與資料庫互動說明

|   #   | 意圖名稱 (Intent)          | 意圖業務涵義     | 後續調用 Service 與 Repository                                                                                                                    | 涉及之資料表 (Tables)                                     | 是否存取 DB |
| :---: | :------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------- | :---------: |
| **1** | `list_user_policies`       | 查詢個人有效保單 | `UserPolicyService.getUserPolicies` ➔ `UserInsuranceRepository.findActiveByUserId`                                                                | `user_insurance`<br/>`insurance` (INNER JOIN)             |   **是**    |
| **2** | `claim_required_documents` | 查詢理賠必備文件 | `ClaimService.getClaimRequirements` ➔ 先由 `UserInsuranceRepository` 查保單 ➔ 再由 `ClaimRequirementRepository.findByInsuranceAndType` 查文件清單 | `user_insurance`<br/>`insurance`<br/>`claim_requirements` |   **是**    |
| **3** | `start_claim`              | 發起理賠引導流程 | `ClaimService.prepareClaim` ➔ `UserInsuranceRepository.findActiveByUserId` 檢驗有效保單                                                           | `user_insurance`<br/>`insurance`                          |   **是**    |
| **4** | `redirect_to_human`        | 轉接專人客服     | `IntentRouter.redirectToHumanResponse` 直接回傳文字                                                                                               | 無                                                        |   **否**    |
| **5** | `unknown`                  | 未知意圖提示     | `IntentRouter.unknownResponse` 直接回傳引導問句                                                                                                   | 無                                                        |   **否**    |

---

## 3. 各階段核心代碼映射

1. **入口路由與中介層**：
   - 路由：[`backend/src/routes/assistant.routes.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/routes/assistant.routes.ts)
   - 認證中介層：[`backend/src/middlewares/auth.middleware.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/middlewares/auth.middleware.ts)
2. **控制器層**：
   - 控制器：[`backend/src/controllers/assistant.controller.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/controllers/assistant.controller.ts)
3. **AI 意圖識別與路由**：
   - 意圖識別器：[`backend/src/ai/intent-classifier.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/ai/intent-classifier.ts)
   - 意圖路由器：[`backend/src/ai/intent-router.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/ai/intent-router.ts)
4. **商業邏輯層**：
   - 保單服務：[`backend/src/services/user-policy.service.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/services/user-policy.service.ts)
   - 理賠服務：[`backend/src/services/claim.service.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/services/claim.service.ts)
5. **資料存取層 (Drizzle ORM ➔ 連線池 ➔ MySQL)**：
   - 保單存取：[`backend/src/repositories/user-insurance.repository.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/repositories/user-insurance.repository.ts)
   - 理賠文件存取：[`backend/src/repositories/claim-requirement.repository.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/repositories/claim-requirement.repository.ts)
   - 資料庫連線池：[`backend/src/db/index.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/src/db/index.ts)
