# 🗄️ 04 - 資料庫與版控規範 (MySQL & db/)

本文件定義 MySQL 8.0 資料庫的綱要設計標準、命名規則，以及在 `db/` 目錄下的 DDL 與 DML 結構化版本控制規範。

---

## 1. 資料庫基礎規範

- **資料庫引擎**：MySQL 8.0+（嚴格使用 **InnoDB** 儲存引擎，保證 ACID 事務支援與外鍵約束）。
- **字元集與定序**：
  - 字元集：`utf8mb4`（支援完整 Unicode 與 Emoji）。
  - 定序規則 (Collation)：`utf8mb4_unicode_ci`。
- **時區標準**：伺服器與連線一律使用 **UTC**（或統一定義為 Asia/Taipei，需與後端 Config 保持一致）。

---

## 2. `db/` 目錄版控架構

所有資料庫結構與初始資料變更，**必須** 以 SQL 檔案形式收錄至專案根目錄的 `db/` 中納入 Git 版控：

```
db/
├── ddl/                           # Data Definition Language (表結構、索引、檢視表)
│   ├── V001__create_initial_schema.sql
│   └── V002__add_claim_status_index.sql
├── dml/                           # Data Manipulation Language (初始種子資料、系統字典)
│   ├── V001__seed_insurance_catalog.sql
│   └── V002__seed_claim_requirements.sql
└── README.md                      # 資料庫初始化與遷移執行手冊
```

### 2.1 檔案命名規則
- 格式：`V{序號}__{簡短描述}.sql`
  - `V`：大寫開頭表示 Version。
  - `{序號}`：三位數遞增數字（如 `001`, `002`），確保檔案總覽與執行順序自然排列。
  - `__`：雙底線作為版本與說明的分隔符號。
  - `{簡短描述}`：英文蛇形命名（如 `create_initial_schema`）。

### 2.2 版本控管鐵律
1. **不可變原則 (Immutability)**：凡是已合併至 `main` / `dev` 或已在生產/測試環境執行的 Migration 檔案，**嚴禁修改既有內容**。
2. **新增遷移 (Add-only Migration)**：若要增修欄位或修改索引，必須新建下一個序號的 DDL 檔案（例如 `V002__alter_user_insurance_add_column.sql`）。
3. **冪等性設計 (Idempotency)**：
   - 建立資料表使用 `CREATE TABLE IF NOT EXISTS`。
   - 插入種子資料採用 `INSERT IGNORE` 或 `ON DUPLICATE KEY UPDATE`。

---

## 3. 資料表命名與設計標準

### 3.1 命名約定
| 對象 | 規則 | 範例 |
| :--- | :--- | :--- |
| **資料表 (Table)** | 全小寫蛇形、複數或語意名詞 | `users`, `insurance`, `user_insurance`, `claim_requirements` |
| **主鍵 (Primary Key)** | 一律命名為 `id` | `id` (CHAR(36) UUID 或 BIGINT AUTO_INCREMENT) |
| **外鍵 (Foreign Key)** | `{參照表單數}_id` | `user_id`, `insurance_id` |
| **外鍵約束名稱** | `fk_{來源表}_{目標表}_{欄位}` | `fk_user_insurance_users_user_id` |
| **一般索引名稱** | `idx_{表名}_{欄位名}` | `idx_user_insurance_status` |
| **唯一索引名稱** | `uk_{表名}_{欄位名}` | `uk_insurance_code` |
| **時間戳記** | 系統審計必備兩欄位 | `created_at`, `updated_at` |

### 3.2 系統核心 DDL 範例 (MySQL 8.0)

```sql
-- db/ddl/V001__create_initial_schema.sql
-- 1. 使用者主表
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 保險商品定義表
CREATE TABLE IF NOT EXISTS insurance (
    id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL COMMENT 'LIFE, HEALTH, ACCIDENT...',
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_insurance PRIMARY KEY (id),
    CONSTRAINT uk_insurance_code UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 使用者保單關聯表
CREATE TABLE IF NOT EXISTS user_insurance (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    insurance_id VARCHAR(50) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, EXPIRED, TERMINATED',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_user_insurance PRIMARY KEY (id),
    CONSTRAINT uk_user_insurance_policy_number UNIQUE (policy_number),
    CONSTRAINT fk_user_insurance_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_insurance_insurance FOREIGN KEY (insurance_id) REFERENCES insurance (id) ON DELETE RESTRICT,
    INDEX idx_user_insurance_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 理賠所需文件規則表 (使用 MySQL 原生 JSON)
CREATE TABLE IF NOT EXISTS claim_requirements (
    id CHAR(36) NOT NULL,
    insurance_id VARCHAR(50) NOT NULL,
    claim_type VARCHAR(50) NOT NULL COMMENT 'hospitalization, accident, death...',
    required_documents JSON NOT NULL COMMENT '文件清單陣列 JSON',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_claim_requirements PRIMARY KEY (id),
    CONSTRAINT fk_claim_requirements_insurance FOREIGN KEY (insurance_id) REFERENCES insurance (id) ON DELETE CASCADE,
    INDEX idx_claim_requirements_lookup (insurance_id, claim_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. 事務 (Transaction) 與查詢規範

1. **強制使用參數化查詢 (Parameterized Queries)**：所有 SQL 查詢必須使用預編譯語句（Prepared Statement / `?` 佔位符），嚴格防範 SQL 注入攻擊。
2. **多表異動事務保證**：凡涉及兩張表以上資料異動（如新增理賠申請同時更新保單狀態），必須在 Service 層開啟 Transaction（`START TRANSACTION` ... `COMMIT` / `ROLLBACK`）。
3. **避免 `SELECT *`**：Repository 查詢時應明確列出需要的欄位，以提高效能與記憶體利用率。
