# ⚙️ 02 - 後端開發規範 (TypeScript & pnpm)

本文件定義後端 AP Server 的開發標準、TypeScript 規範、依賴套件管理（pnpm）以及三層式架構的實作參考範例。

---

## 1. 開發環境與套件管理 (pnpm)

- **Node.js**：`>= 20.10.0 LTS`
- **套件管理器**：強制使用 **pnpm**（禁絕使用 `npm` 或 `yarn` 產生衝突的 lockfile）。
  - 安裝依賴：`pnpm install`
  - 新增套件：`pnpm add <package>`（生產環境）或 `pnpm add -D <package>`（開發環境）
  - 執行腳本：`pnpm dev` / `pnpm build` / `pnpm test`
  - 鎖定檔規範：`pnpm-lock.yaml` **必須** 納入 Git 版本控制，禁止手動修改。

### 1.1 TypeScript 編譯配置 (`tsconfig.json`)

後端專案必須啟用最嚴格的型別檢查：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 2. 後端目錄結構規範 (Directory Layout)

```
backend/
├── src/
│   ├── config/              # 環境變數載入與驗證 (DB, GCP, Better Auth)
│   ├── controllers/         # API 控制器 (負責 HTTP 進入與回應)
│   │   ├── assistant.controller.ts
│   │   ├── policy.controller.ts
│   │   └── claim.controller.ts
│   ├── services/            # 商業邏輯層 (純 TypeScript 類別)
│   │   ├── user-policy.service.ts
│   │   ├── claim.service.ts
│   │   └── assistant.service.ts
│   ├── repositories/        # 資料庫存取層 (MySQL SQL 查詢)
│   │   ├── user-insurance.repository.ts
│   │   └── claim-requirement.repository.ts
│   ├── ai/                  # AI 意圖識別器與 Prompt 整合
│   │   ├── intent-classifier.ts
│   │   └── intent-router.ts
│   ├── templates/           # 回應模板 (Response & Action Templates)
│   │   ├── policy.template.ts
│   │   └── claim.template.ts
│   ├── middlewares/         # Express / Fastify 中介軟體
│   │   ├── auth.middleware.ts       # Better Auth 驗證
│   │   ├── error.middleware.ts      # 全域錯誤攔截
│   │   └── validate.middleware.ts   # 請求驗證中介
│   ├── models/              # 資料庫實體與 DTO 型別定義
│   │   ├── dtos/
│   │   └── entities/
│   ├── utils/               # 工具函式 (Logger, Helper)
│   ├── app.ts               # Express / 應用初始化配置
│   └── index.ts             # 伺服器啟動入口 (監聽 PORT)
├── tests/                   # 單元測試與整合測試
├── Dockerfile               # 多階段建置 Docker 檔
├── package.json             # 專案依賴與腳本
├── pnpm-lock.yaml           # pnpm 依賴鎖定檔
└── tsconfig.json            # TypeScript 編譯配置
```

---

## 3. 三層式架構實作範例

以下展示「查詢使用者保單」在 Controller、Service、Repository 的標準實作模式：

### 3.1 Repository Layer 實作
負責參數化 SQL 查詢與 MySQL 連線池交互：

```typescript
// src/repositories/user-insurance.repository.ts
import { Pool } from 'mysql2/promise';
import { UserInsuranceEntity } from '../models/entities/user-insurance.entity.js';

export interface IUserInsuranceRepository {
  findActiveByUserId(userId: string): Promise<UserInsuranceEntity[]>;
}

export class UserInsuranceRepository implements IUserInsuranceRepository {
  constructor(private readonly dbPool: Pool) {}

  async findActiveByUserId(userId: string): Promise<UserInsuranceEntity[]> {
    const query = `
      SELECT 
        ui.id, ui.user_id, ui.insurance_id, ui.policy_number, 
        ui.status, ui.start_date, ui.end_date,
        i.name as insurance_name, i.type as insurance_type
      FROM user_insurance ui
      INNER JOIN insurance i ON ui.insurance_id = i.id
      WHERE ui.user_id = ? AND ui.status = 'ACTIVE'
      ORDER BY ui.start_date DESC;
    `;
    const [rows] = await this.dbPool.execute(query, [userId]);
    return rows as UserInsuranceEntity[];
  }
}
```

### 3.2 Service Layer 實作
不接觸 HTTP 物件，專注商業邏輯與模板組合：

```typescript
// src/services/user-policy.service.ts
import { IUserInsuranceRepository } from '../repositories/user-insurance.repository.js';
import { PolicyTemplate } from '../templates/policy.template.js';
import { PolicyResponseDTO } from '../models/dtos/policy.dto.js';

export class UserPolicyService {
  constructor(private readonly policyRepo: IUserInsuranceRepository) {}

  async getUserPolicies(userId: string): Promise<PolicyResponseDTO> {
    const rawPolicies = await this.policyRepo.findActiveByUserId(userId);
    
    // 商業邏輯運算或過濾
    const policies = rawPolicies.map((p) => ({
      id: p.policy_number,
      name: p.insurance_name,
      status: p.status,
      type: p.insurance_type
    }));

    // 調用模板引擎產生友善對話回覆
    const formattedContent = PolicyTemplate.formatList(policies);

    return {
      type: 'text',
      intent: 'list_user_policies',
      content: formattedContent,
      data: {
        totalPolicies: policies.length,
        policies
      }
    };
  }
}
```

### 3.3 Controller Layer 實作
解析請求、驗證參數、調用 Service、回傳標準 JSON：

```typescript
// src/controllers/policy.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserPolicyService } from '../services/user-policy.service.js';

export class PolicyController {
  constructor(private readonly policyService: UserPolicyService) {}

  getPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id; // 來自 Better Auth Middleware 注入
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '尚未登入' } });
        return;
      }

      const result = await this.policyService.getUserPolicies(userId);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error); // 導流至統一全域錯誤處理中介層
    }
  };
}
```

---

## 4. API 設計與回應規範 (API Standards)

### 4.1 統一 JSON 回應外殼 (Envelope Format)

所有 HTTP API 回傳均需遵守以下統一包裝格式：

#### 成功回應 (HTTP 200 / 201)
```json
{
  "success": true,
  "data": {
    "type": "text",
    "intent": "list_user_policies",
    "content": "您目前共有 2 張有效保單...",
    "data": { ... }
  },
  "meta": {
    "timestamp": 1727700000000,
    "requestId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

#### 失敗回應 (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "請求參數不正確",
    "details": [
      { "field": "message", "issue": "Message cannot be empty" }
    ]
  },
  "meta": {
    "timestamp": 1727700000000,
    "requestId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

### 4.2 錯誤處理規範 (Error Handling)

1. **自定義業務異常類別**：
   - 建立 `AppError`（繼承自 `Error`），攜帶 `statusCode`、`errorCode` 與可安全透露給前端的 `message`。
2. **全域錯誤中介層 (Error Middleware)**：
   - 捕捉所有未處理的例外。
   - 生產環境下（`NODE_ENV=production`）**嚴禁將伺服器 Stack Trace 洩漏給前端**。
   - 所有錯誤必須記錄至標準日誌 (Structured Logger)。
