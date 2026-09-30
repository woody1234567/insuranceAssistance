-- ============================================================================
-- Migration: V001__seed_initial_data.sql
-- Description: 插入系統初始保險商品與理賠文件規則種子資料 (MySQL 8.0+)
-- ============================================================================

-- 1. 插入基礎保險商品
INSERT INTO insurance (id, code, name, type, description) VALUES
('INS-LIFE-001', 'LIFE_WHOLE_01', '安心終身壽險', 'LIFE', '提供全方位身故與完全失能保障，照顧家人未來生活。'),
('INS-HEALTH-001', 'HEALTH_HOSP_01', '守護醫療健康保險', 'HEALTH', '涵蓋住院日額、加護病房加倍給付與手術醫療保險金。'),
('INS-ACC-001', 'ACCIDENT_PA_01', '意外傷害保障保險', 'ACCIDENT', '全天候保障意外身故、失能與實支實付傷害醫療。')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    type = VALUES(type),
    description = VALUES(description);

-- 2. 插入健康醫療險住院理賠所需文件
INSERT INTO claim_requirements (id, insurance_id, claim_type, required_documents, notes) VALUES
(
    'REQ-HEALTH-001',
    'INS-HEALTH-001',
    'hospitalization',
    '[
        {"name": "醫療診斷證明書", "isOriginalRequired": true, "description": "載明入院及出院日期與病名之正本證明書"},
        {"name": "醫療費用收據與明細表", "isOriginalRequired": true, "description": "醫院開立之各項醫療收費明細與正本收據"},
        {"name": "保險理賠申請書", "isOriginalRequired": false, "description": "填寫被保險人與受益人資料並親簽"},
        {"name": "身分證正反面影本及存摺封面", "isOriginalRequired": false, "description": "給付理賠金指定匯款帳號影本"}
    ]',
    '收據如為影本需加蓋醫療院所「與正本相符」章戳'
),
(
    'REQ-ACC-001',
    'INS-ACC-001',
    'accident',
    '[
        {"name": "意外傷害事故證明文件", "isOriginalRequired": false, "description": "如交通事故三聯單或報案證明"},
        {"name": "醫療診斷證明書", "isOriginalRequired": true, "description": "載明意外傷害之正本診斷證明書"},
        {"name": "醫療費用收據正本", "isOriginalRequired": true, "description": "實支實付理賠必備醫療費用收據"},
        {"name": "保險理賠申請書", "isOriginalRequired": false, "description": "填寫事故經過並親自簽署"}
    ]',
    '如涉及車禍請務必檢附交通事故初判表或現場圖'
)
ON DUPLICATE KEY UPDATE 
    required_documents = VALUES(required_documents),
    notes = VALUES(notes);
