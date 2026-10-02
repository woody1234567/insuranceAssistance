# 🗄️ 資料庫版本控制 (Database Version Control)

本目錄收錄「保險智慧助理」專案所有的資料庫綱要定義 (DDL) 與資料操作 (DML) 腳本。

---

## 📁 目錄結構

```
db/
├── ddl/                           # 資料定義語言 (核心表結構：users, insurance, user_insurance, claim_requirements)
│   └── V001__create_initial_schema.sql
├── dml/                           # 資料操作語言 (種子資料、測試使用者、測試保單與理賠規範)
│   └── V001__seed_initial_data.sql
└── README.md                      # 資料庫管理手冊 (本文件)
```

---

## 📜 執行順序與原則

1. **先結構 (DDL)，後資料 (DML)**：每次在新環境初始化資料庫時，必須先執行 `ddl/` 目錄下的 SQL 腳本建立表結構，再執行 `dml/` 目錄下的種子資料腳本。
2. **檔案命名**：遵守 `V{三位數版號}__{描述}.sql` 命名規範（例如 `V001__create_initial_schema.sql`）。
3. **不可變動原則**：已經發佈或於環境執行的腳本**絕對不可修改**。若需變更表結構或修正資料，請新增下一個版本號之腳本（例如 `V002__alter_table_xyz.sql`）。
4. **字元集要求**：資料庫與連線統一要求 `utf8mb4` 與 `utf8mb4_unicode_ci`。

---

## 👥 測試使用者清單 (Test Users)

所有測試使用者皆已設定完成個人資料與多樣化業務情境保單：
- **身分驗證方式**：支援於請求標頭帶入 `Authorization: Bearer <userId>` 或 `x-user-id: <userId>` 進行驗證。

| 姓名 | 使用者 ID (UUID) | Email | 保單編號 | 保險商品 | 保單狀態 | 測試情境 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **陳威廷** | `00000000-0000-0000-0000-000000000001` | `wei.chen@example.com` | POL-LIFE-2025-0001<br>POL-HEALTH-2025-0001 | 安心終身壽險<br>守護醫療健康保險 | `ACTIVE`<br>`ACTIVE` | 雙有效保單，對應後端核心整合測試 |
| **林怡君** | `00000000-0000-0000-0000-000000000002` | `jane.lin@example.com` | POL-ACC-2024-0001<br>POL-HEALTH-2024-0002 | 意外傷害保障保險<br>守護醫療健康保險 | `ACTIVE`<br>`ACTIVE` | 意外與醫療雙有效保單，理賠諮詢測試 |
| **黃志明** | `00000000-0000-0000-0000-000000000003` | `ming.huang@example.com` | POL-HEALTH-2023-0001<br>POL-LIFE-2023-0002 | 守護醫療健康保險<br>安心終身壽險 | `EXPIRED`<br>`ACTIVE` | 包含過期醫療保單，測試效期過期與理賠判定 |
| **王雅婷** | `00000000-0000-0000-0000-000000000004` | `sarah.wang@example.com` | POL-LIFE-2026-0001<br>POL-PROP-2026-0001 | 安心終身壽險<br>全方位居家綜合保險 | `ACTIVE`<br>`ACTIVE` | 壽險與財產責任險組合 |
| **李冠廷** | `00000000-0000-0000-0000-000000000005` | `kevin.lee@example.com` | POL-ACC-2025-0001 | 意外傷害保障保險 | `TERMINATED` | 保單已解約終止，測試終止保單查詢與提示 |

---

## 🐳 本地 Docker 快速啟動 MySQL

專案可透過 Docker 快速於本機啟動 MySQL 8.0 測試實例：

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
```

### 匯入 Initial Schema 與 Seed Data：

```bash
# 1. 執行 DDL 建立全部資料表結構
mysql -h 127.0.0.1 -P 3306 -u app_backend -papp_secret insurance_db < db/ddl/V001__create_initial_schema.sql

# 2. 執行 DML 匯入測試使用者與基礎資料
mysql -h 127.0.0.1 -P 3306 -u app_backend -papp_secret insurance_db < db/dml/V001__seed_initial_data.sql
```
