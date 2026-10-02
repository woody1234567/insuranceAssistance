# 🚀 05 - 容器化與 GCP Cloud Run 部署規範

本文件定義「保險智慧助理」系統的容器化標準、GCP Cloud Run 部署架構、Cloud SQL (MySQL) 連線配置與 GCP Secret Manager 金鑰安全管理標準。

---

## 1. 部署架構設計 (Cloud Run Dual-Service)

前後端作為兩個獨立的 Cloud Run 服務分別部署：

```
                         Internet (HTTPS)
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌────────────────────────┐             ┌────────────────────────┐
│  Web Server (Frontend) │             │  AP Server (Backend)   │
│  - Vue 3 + Nginx       │             │  - Node.js + TS        │
│  - Cloud Run Service   │             │  - Cloud Run Service   │
│  - URL: web-app-xxx    │             │  - URL: api-app-xxx    │
└────────────────────────┘             └───────────┬────────────┘
        │                                          │
        │ SPA 呼叫 API (CORS 允許 Web 網域)         │
        └──────────────────────────────────────────┘
                                                   │
                                                   ├─► GCP Secret Manager (憑證/密鑰)
                                                   │
                                                   └─► GCP Cloud SQL (MySQL 8.0)
                                                       (Unix Socket: /cloudsql/INSTANCE)
```

---

## 2. 前端容器化規範 (Web Server Dockerfile)

前端採用 **Multi-stage Build**，第一階段使用 Node.js + pnpm 編譯 Vue 3 靜態檔案，第二階段使用極輕量的 `nginx:alpine` 託管：

```dockerfile
# frontend/Dockerfile
# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# 傳入建置期環境變數 (後端 API 位址)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm build

# ---- Stage 2: Serve ----
FROM nginx:alpine

# 覆蓋預設 Nginx 配置以支援 SPA History 路由
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2.1 前端 Nginx 配置 (`frontend/nginx.conf`)
必須包含 `try_files $uri $uri/ /index.html;`，防止使用者重新整理解構路由時出現 404：

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 靜態資源快取最佳化
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

## 3. 後端容器化規範 (AP Server Dockerfile)

後端同樣採用 **Multi-stage Build**，確保最終 Production 映像檔不含 `devDependencies` 與 TypeScript 編譯器：

```dockerfile
# backend/Dockerfile
# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- Stage 2: Production Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json pnpm-lock.yaml ./
# 僅安裝生產依賴
RUN pnpm install --prod --frozen-lockfile

# 從建置階段複製編譯後的 dist
COPY --from=builder /app/dist ./dist

# Cloud Run 預設以非 root 使用者執行最佳
USER node

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

---

## 4. GCP Cloud Run 服務配置標準

| 服務項目 | Web Server (前端) | AP Server (後端) |
| :--- | :--- | :--- |
| **容器 Port** | `80` (由 Nginx 監聽) | `8080` (由 Node.js 監聽 `process.env.PORT`) |
| **CPU 配置** | 1 vCPU | 1 ~ 2 vCPU |
| **Memory 配置** | 512 MiB | 1 GiB ~ 2 GiB |
| **並發度 (Concurrency)** | 1000 (靜態檔案) | 80 (API 請求) |
| **最小執行個體 (Min Instances)** | 0 (非熱點期冷啟動) 或 1 (核心環境) | 0 或 1 (降低冷啟動延遲) |
| **最大執行個體 (Max Instances)** | 10 | 20 |
| **Ingress 網路** | All (公開流量存取) | All (公開流量存取，搭配嚴格 CORS) |

---

## 5. GCP 受管服務整合

### 5.1 Cloud SQL (MySQL) 連線設定
Cloud Run 與 Cloud SQL MySQL 連線推薦使用 **Unix Socket**（自動透過 Cloud SQL Auth Proxy，無須暴露公網 IP）：

- **Cloud Run 連線標記**：`--add-cloudsql-instances=<PROJECT_ID>:<REGION>:<INSTANCE_NAME>`
- **Socket 路徑**：`/cloudsql/<PROJECT_ID>:<REGION>:<INSTANCE_NAME>`
- **連線字串 / 配置範例**：
  ```env
  DB_SOCKET_PATH="/cloudsql/my-project:asia-east1:insurance-mysql"
  DB_USER="app_backend"
  DB_PASSWORD="<from-secret-manager>"
  DB_NAME="insurance_db"
  ```

### 5.2 GCP Secret Manager 機敏資訊注入
任何敏感資訊**嚴禁寫入 Dockerfile 或 Git 倉庫**，透過 Cloud Run 的 Secret 參照注入：

```bash
gcloud run deploy insurance-ap-server \
  --image asia-east1-docker.pkg.dev/my-project/insurance-repo/ap-server:latest \
  --region asia-east1 \
  --set-env-vars="AI_PROVIDER=google-vertex,AI_MODEL=gemini-2.0-flash,GOOGLE_VERTEX_LOCATION=asia-east1,CORS_ORIGIN=https://insurance.yourdomain.com,DB_SOCKET_PATH=/cloudsql/my-project:asia-east1:insurance-mysql,DB_USER=app_backend,DB_NAME=insurance_db" \
  --set-secrets="DB_PASSWORD=DB_PASSWORD:latest" \
  --add-cloudsql-instances="my-project:asia-east1:insurance-mysql"
```

> **Vertex AI 權限配置**：
> Cloud Run 執行的 Service Account 需賦予 Vertex AI 調用權限：
> ```bash
> gcloud projects add-iam-policy-binding PROJECT_ID \
>   --member="serviceAccount:YOUR_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
>   --role="roles/aiplatform.user"
> ```


### 5.3 跨來源資源共享 (CORS) 政策
AP Server 必須於 Express / Fastify 配置嚴格的 CORS 政策，僅允許已授權的 Web Server 網域發出帶有 Credential 的請求：

```typescript
import cors from 'cors';

const allowedOrigins = [
  'https://insurance.yourdomain.com', // 生產網域
  'http://localhost:5173'             // 本地 Vite 開發
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true
}));
```
