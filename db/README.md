# 🗄️ 資料庫版本控制 (Database Version Control)

本目錄收錄「保險智慧助理」專案所有的資料庫綱要定義 (DDL) 與資料操作 (DML) 腳本。

---

## 📁 目錄結構

```
db/
├── ddl/                           # 資料定義語言 (結構、表格、索引、約束)
│   └── V001__create_initial_schema.sql
├── dml/                           # 資料操作語言 (種子資料、系統常數、初始預設值)
│   └── V001__seed_initial_data.sql
└── README.md                      # 資料庫管理手冊 (本文件)
```

---

## 📜 執行順序與原則

1. **先結構 (DDL)，後資料 (DML)**：每次在新環境初始化資料庫時，必須先依序執行 `ddl/` 目錄下的所有 SQL 腳本，再執行 `dml/` 目錄下的種子資料腳本。
2. **檔案命名**：遵守 `V{三位數版號}__{描述}.sql` 命名規範（例如 `V001__create_initial_schema.sql`）。
3. **不可變動原則**：已經發佈或於環境執行的腳本**絕對不可修改**。若需變更表結構或修正資料，請新增下一個版本號之腳本（例如 `V002__alter_table_xyz.sql`）。
4. **字元集要求**：資料庫與連線統一要求 `utf8mb4` 與 `utf8mb4_unicode_ci`。

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
# 1. 執行 DDL
mysql -h 127.0.0.1 -P 3306 -u app_backend -papp_secret insurance_db < db/ddl/V001__create_initial_schema.sql

# 2. 執行 DML
mysql -h 127.0.0.1 -P 3306 -u app_backend -papp_secret insurance_db < db/dml/V001__seed_initial_data.sql
```
