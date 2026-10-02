# 系統架構圖 (System Architecture)

本文件描述「保險智慧助理」系統的整體實體部署架構，涵蓋前端 Web Server 叢集、負載平衡器（Load Balancer）、後端 AP Server 叢集、外部 Gemini API 服務以及資料庫層。

---

## 1. 系統架構圖 (Mermaid Diagram)

```mermaid
flowchart LR
    %% 用戶端
    subgraph ClientLayer ["用戶端 (Client Layer)"]
        User["使用者 / 瀏覽器<br/>(Client Browser)"]
    end

    %% 前端 Web 伺服器叢集
    subgraph FrontendCluster ["前端 Web 伺服器叢集 (Frontend Web Servers)"]
        direction TB
        Web1["Web Server 1"]
        Web2["Web Server 2"]
        Web3["Web Server 3"]
    end

    %% 負載平衡器
    subgraph LBLayer ["負載平衡層 (Load Balancing Layer)"]
        LB["負載平衡器<br/>(Load Balancer / Reverse Proxy)"]
    end

    %% 後端 AP 伺服器叢集
    subgraph BackendCluster ["後端 AP 伺服器叢集 (Backend AP Servers)"]
        direction TB
        AP1["AP Server 1"]
        AP2["AP Server 2"]
        AP3["AP Server 3"]
    end

    %% 外部服務與資料庫
    subgraph ExternalServices ["外部整合服務 (External Services)"]
        GeminiAPI["Google Gemini API<br/>(LLM / 意圖識別與保險分析)"]
    end

    subgraph DataStorage ["資料庫層 (Database Tier)"]
        Database[("關聯式資料庫<br/>(MySQL 8.0 / Cloud SQL)")]
    end

    %% 流程連線
    User -->|"1. 瀏覽頁面 / 取得靜態資產"| Web1
    User -->|"1. 瀏覽頁面 / 取得靜態資產"| Web2
    User -->|"1. 瀏覽頁面 / 取得靜態資產"| Web3

    Web1 -.->|"或由前端轉發 API"| LB
    Web2 -.->|"或由前端轉發 API"| LB
    Web3 -.->|"或由前端轉發 API"| LB

    LB -->|"分發請求"| AP1
    LB -->|"分發請求"| AP2
    LB -->|"分發請求"| AP3

    AP1 <-->|"3. 呼叫模型推理"| GeminiAPI
    AP2 <-->|"3. 呼叫模型推理"| GeminiAPI
    AP3 <-->|"3. 呼叫模型推理"| GeminiAPI

    AP1 <-->|"4. CRUD 資料存取"| Database
    AP2 <-->|"4. CRUD 資料存取"| Database
    AP3 <-->|"4. CRUD 資料存取"| Database

    %% 樣式定義
    classDef client fill:#E1F5FE,stroke:#0288D1,stroke-width:2px,color:#01579B;
    classDef web fill:#E8F5E9,stroke:#388E3C,stroke-width:2px,color:#1B5E20;
    classDef lb fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#E65100;
    classDef ap fill:#EDE7F6,stroke:#512DA8,stroke-width:2px,color:#311B92;
    classDef external fill:#FCE4EC,stroke:#C2185B,stroke-width:2px,color:#880E4F;
    classDef db fill:#E0F2F1,stroke:#00796B,stroke-width:2px,color:#004D40;

    class User client;
    class Web1,Web2,Web3 web;
    class LB lb;
    class AP1,AP2,AP3 ap;
    class GeminiAPI external;
    class Database db;
```

---

## 2. 架構元件說明

| 層級         | 元件名稱          | 數量 | 說明與職責                                                                                                                      |
| :----------- | :---------------- | :--: | :------------------------------------------------------------------------------------------------------------------------------ |
| **用戶端**   | Client Browser    |  -   | 使用者裝置與瀏覽器，發起網頁瀏覽與智慧助理對話互動。                                                                            |
| **前端叢集** | Web Server 1 ~ 3  |  3   | 提供前端 SPA（Vue 3 + Vite）靜態資源託管與 Nginx 服務，確保高併發靜態下載能力與容錯能力。                                       |
| **負載平衡** | Load Balancer     |  1   | 接收來自用戶端/前端的 API 請求，依據負載演算法（如輪詢 Round-Robin、最少連線 Least Connection）將流量平均分發至後端 AP Server。 |
| **後端叢集** | AP Server 1 ~ 3   |  3   | Node.js / TypeScript 後端核心，負責身分驗證、控制器業務流程（三層式架構）、保險規則計算及會話管理。                             |
| **外部服務** | Google Gemini API |  1   | 外部大語言模型服務，負責自然語言理解、意圖辨識（Intent Classification）、理賠指引分析與動態回答生成。                           |
| **資料庫層** | MySQL / Cloud SQL |  1   | 核心關聯式資料庫，儲存保戶資料、保單資訊、理賠規則、對話記錄與系統設定等數據。                                                  |

---

## 3. 資料與請求處理流程

1. **靜態資源讀取**：
   - 使用者透過瀏覽器請求網頁時，由 3 台 Web Server 平行分擔靜態檔案（HTML / JS / CSS / Assets）的傳輸。
2. **API 請求轉發**：
   - 使用者在前端發起對話或業務查詢時，API 請求送至負載平衡器（Load Balancer），並由負載平衡器智慧調度給健康狀態良好的 AP Server（AP 1、AP 2 或 AP 3）。
3. **AI 模型呼叫**：
   - 接收到對話的 AP Server 整理 Context 與 Prompt 後，呼叫外部 **Google Gemini API** 進行意圖分析與對話推論。
4. **資料庫讀寫**：
   - AP Server 透過 Repository 層連線至資料庫（MySQL / Cloud SQL），進行保單查詢、理賠進度更新或對話歷程儲存。
