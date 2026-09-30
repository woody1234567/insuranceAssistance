-- ============================================================================
-- Migration: V001__create_initial_schema.sql
-- Description: 建立保險智慧助理系統初始資料表結構 (MySQL 8.0+)
-- ============================================================================

-- 1. 使用者主表 (users)
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL COMMENT 'UUID 主鍵',
    email VARCHAR(255) NOT NULL COMMENT '使用者電子郵件',
    name VARCHAR(100) NOT NULL COMMENT '使用者姓名',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間',
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系統使用者主表';

-- 2. 保險商品定義表 (insurance)
CREATE TABLE IF NOT EXISTS insurance (
    id VARCHAR(50) NOT NULL COMMENT '保險商品識別碼 (如 INS-LIFE-001)',
    code VARCHAR(50) NOT NULL COMMENT '保險代碼',
    name VARCHAR(100) NOT NULL COMMENT '保險商品名稱',
    type VARCHAR(50) NOT NULL COMMENT '商品類型 (LIFE, HEALTH, ACCIDENT, PROPERTY)',
    description TEXT COMMENT '商品簡介與保障內容',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_insurance PRIMARY KEY (id),
    CONSTRAINT uk_insurance_code UNIQUE (code),
    INDEX idx_insurance_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='保險商品目錄';

-- 3. 使用者保單關聯表 (user_insurance)
CREATE TABLE IF NOT EXISTS user_insurance (
    id CHAR(36) NOT NULL COMMENT 'UUID 主鍵',
    user_id CHAR(36) NOT NULL COMMENT '使用者 ID (FK)',
    insurance_id VARCHAR(50) NOT NULL COMMENT '保險商品 ID (FK)',
    policy_number VARCHAR(100) NOT NULL COMMENT '保單號碼 (唯一)',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '保單狀態 (ACTIVE, EXPIRED, TERMINATED)',
    start_date DATE NOT NULL COMMENT '保單生效起日',
    end_date DATE NOT NULL COMMENT '保單終止訖日',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_user_insurance PRIMARY KEY (id),
    CONSTRAINT uk_user_insurance_policy_number UNIQUE (policy_number),
    CONSTRAINT fk_user_insurance_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_insurance_insurance FOREIGN KEY (insurance_id) REFERENCES insurance (id) ON DELETE RESTRICT,
    INDEX idx_user_insurance_lookup (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者持有保單明細';

-- 4. 理賠所需文件規則表 (claim_requirements)
CREATE TABLE IF NOT EXISTS claim_requirements (
    id CHAR(36) NOT NULL COMMENT 'UUID 主鍵',
    insurance_id VARCHAR(50) NOT NULL COMMENT '對應保險商品 ID (FK)',
    claim_type VARCHAR(50) NOT NULL COMMENT '出險/理賠類型 (hospitalization, accident, surgery)',
    required_documents JSON NOT NULL COMMENT '理賠所需文件結構化清單 (JSON 陣列)',
    notes TEXT COMMENT '備註與注意事項',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_claim_requirements PRIMARY KEY (id),
    CONSTRAINT fk_claim_requirements_insurance FOREIGN KEY (insurance_id) REFERENCES insurance (id) ON DELETE CASCADE,
    INDEX idx_claim_requirements_lookup (insurance_id, claim_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='保險理賠文件規範與規則表';
