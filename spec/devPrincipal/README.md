# 📖 保險智慧助理 — 開發準則總覽 (Development Principles)

本目錄定義「保險智慧助理 (Insurance Assistance)」專案的整體系統架構、前後端開發標準、資料庫管理規範以及 GCP Cloud Run 雲端部署指南。所有團隊成員在進行架構設計、功能開發與程式碼審查 (Code Review) 時，均應遵循此準則。

---

## 🧭 核心設計原則

1. **職責分離 (Separation of Concerns, SoC)**：
   - **前後端實體解耦**：前端 (Web Server) 與後端 (AP Server) 獨立開發、獨立建置、獨立部署至 GCP Cloud Run。
   - **後端嚴格三層架構**：Controller（表現層）、Service（商業邏輯層）、Repository（資料存取層）分工明確，禁止跨層調用。
2. **型別安全與合約優先 (Type Safety & Contract-First)**：
   - 全面採用 **TypeScript** 嚴格模式 (`strict: true`)。
   - 前後端介面透過明確的 DTO 與 OpenAPI/REST 合約定義，確保資料一致性。
3. **基礎設施即代碼與可版本化 (Version Controlled Infrastructure & Data)**：
   - 資料庫 DDL（結構）與 DML（資料）全部收錄於 `db/` 目錄納入 Git 版本控制，禁止直接於生產資料庫手動執行未版控變更。
   - 容器化標準化，全系統可透過 Docker 與環境變數在本地與雲端無縫運行。
4. **雲原生無狀態設計 (Cloud-Native & Stateless)**：
   - 應用程式無狀態化設計，充分發揮 GCP Cloud Run 的自動水平擴展 (Auto-scaling) 優勢。
   - 敏感配置與憑證嚴禁寫入代碼，一律由 GCP Secret Manager 注入環境變數。

---

## 🛠️ 核心技術棧 (Tech Stack)

| 領域 | 技術選型 | 說明 |
| :--- | :--- | :--- |
| **套件管理器** | `pnpm` (>= 9.x) | 前後端統一使用 pnpm，確保依賴解析快速且節省空間 |
| **前端應用 (Web Server)** | Vue 3 + Vite + TypeScript | 響應式 SPA 介面、Pinia 狀態管理、Vue Router 路由控制 |
| **後端服務 (AP Server)** | Node.js (LTS >= 20) + Express + TypeScript | 三層式架構、RESTful API、Drizzle ORM、AI 意圖路由 |
| **資料庫系統** | MySQL (8.0+) | 關聯式資料庫，儲存保單、使用者資料與理賠規則 |
| **資料庫版控** | SQL Script (`db/ddl`, `db/dml`) | 結構化遷移腳本版控，支援回溯與環境重建 |
| **容器與部署** | Docker + GCP Cloud Run | 雙服務獨立容器化部屬，搭配 Cloud SQL (MySQL) |

---

## 📚 規範文件目錄

本開發準則細分為五大專題文件，請依照開發領域查閱對應規範：

- [01. 系統架構與三層式設計準則](file:///home/woody/small_projects/insuranceAssistance/spec/devPrincipal/01-architecture.md)
  - Web Server 與 AP Server 分離設計
  - Controller-Service-Repository 三層職責劃分與資料流規範
- [02. 後端開發規範 (TypeScript, Express & Drizzle ORM)](file:///home/woody/small_projects/insuranceAssistance/spec/devPrincipal/02-backend.md)
  - TypeScript 撰寫標準、專案目錄結構
  - RESTful API 設計、輸入驗證、統一回應與錯誤處理
- [03. 前端開發規範 (Vue 3)](file:///home/woody/small_projects/insuranceAssistance/spec/devPrincipal/03-frontend.md)
  - Vue 3 Composition API 與 SFC 撰寫風格
  - 狀態管理、AP Server 串接與動態意圖動作 (NAVIGATE Action) 處理
- [04. 資料庫設計與版控規範 (MySQL & db/)](file:///home/woody/small_projects/insuranceAssistance/spec/devPrincipal/04-database.md)
  - MySQL 8.0 命名習慣、欄位型態與索引原則
  - `db/ddl` 與 `db/dml` 遷移腳本命名與版控策略
- [05. GCP Cloud Run 容器化與部署規範](file:///home/woody/small_projects/insuranceAssistance/spec/devPrincipal/05-deployment.md)
  - Multi-stage Dockerfile 最佳實踐
  - Cloud Run 服務配置、Cloud SQL Auth Proxy 連線、Secret Manager 整合

---

## 💻 本地環境規範

所有開發者本機環境需滿足以下工具版本需求：

- **Node.js**：`>= 20.10.0 LTS`（建議使用 `nvm` 或 `fnm` 進行版本管理）
- **pnpm**：`>= 9.0.0`（安裝指令：`corepack enable && corepack prepare pnpm@latest --activate`）
- **Docker**：`>= 24.0`（支援 Docker Compose 供本地起 MySQL 8.0 容器測試）
- **MySQL**：`8.0+`（編碼規範：`utf8mb4`，定序：`utf8mb4_unicode_ci`）
