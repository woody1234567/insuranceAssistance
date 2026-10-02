# 🖥️ 03 - 前端開發規範 (React)

本文件定義前端應用（Web Server）的開發標準、React 18+ 與 TypeScript 規範、狀態管理（Zustand）、路由控制（React Router）以及與後端 AP Server 的通訊整合機制。

---

## 1. 前端技術棧與定位 (Tech Stack & Role)

- **框架**：React 18+（嚴格使用 **函式型元件 (Functional Components)** 與 **Hooks**）
- **建置工具**：Vite
- **型別系統**：TypeScript (Strict Mode)
- **狀態管理**：Zustand
- **路由控制**：React Router (HTML5 History Mode)
- **套件管理**：**pnpm**
- **Web Server 角色定位**：
  - 前端經過 Vite 編譯後輸出靜態檔案（HTML / JS / CSS）。
  - 打包入 Nginx 容器作為獨立的 **Web Server** 部署至 GCP Cloud Run。
  - Web Server 配置路由重導（Fallback to `index.html`），保證 SPA 頁面重新整理不報 404。

---

## 2. 目錄結構規範 (Directory Layout)

```
frontend/
├── public/                  # 靜態資源 (favicon, robots.txt)
├── src/
│   ├── assets/              # 樣式、圖示、靜態字型
│   ├── components/          # 可複用 UI 元件
│   │   ├── chat/            # 智慧助理對話相關元件
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── PolicyCard.tsx
│   │   └── common/          # 通用元件 (Button, Modal, Loading)
│   ├── views/               # 頁面級別視圖 (Pages)
│   │   ├── AssistantView.tsx  # 助理對話主畫面
│   │   ├── PoliciesView.tsx   # 保單清單頁
│   │   └── ClaimApplyView.tsx # 理賠申請表單頁
│   ├── hooks/               # 業務邏輯自訂 Hook (useAssistant, useAuth)
│   ├── stores/              # Zustand 狀態模組 (chatStore, userStore)
│   ├── router/              # React Router 路由定義
│   │   └── index.tsx
│   ├── services/            # API 客戶端封裝 (Axios / Fetch)
│   │   └── api.client.ts
│   ├── types/               # 前端專屬 TypeScript 型別定義
│   │   ├── assistant.ts
│   │   └── policy.ts
│   ├── App.tsx              # 應用根元件
│   └── main.tsx             # 應用程式入口
├── nginx.conf               # Web Server 容器用 Nginx 設定
├── Dockerfile               # 前端獨立建置 Dockerfile
├── index.html               # SPA 入口 HTML
├── package.json             # 前端依賴配置
├── pnpm-lock.yaml           # pnpm 依賴鎖定檔
├── tsconfig.json            # 前端 TypeScript 配置
└── vite.config.ts           # Vite 建置配置
```

---

## 3. 元件開發風格標準 (Component Conventions)

### 3.1 TSX 元件結構與命名
- 檔名採用 **PascalCase**（如 `PolicyCard.tsx`, `AssistantView.tsx`）。
- 嚴格遵守 TypeScript 型別宣告，優先採用函式宣告或 `React.FC<Props>` 規範定義 Props 介面。
- 內部樣式可結合 CSS Modules 或統一樣式檔規範。

```tsx
import React from 'react';

// 定義 Props (採用 TypeScript 介面)
interface PolicyCardProps {
  policyNumber: string;
  policyName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  onSelect?: (policyNumber: string) => void;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({
  policyNumber,
  policyName,
  status,
  onSelect
}) => {
  const isActive = status === 'ACTIVE';

  const handleClick = () => {
    onSelect?.(policyNumber);
  };

  return (
    <div
      className={`policy-card ${isActive ? 'active' : ''}`}
      onClick={handleClick}
    >
      <h3>{policyName}</h3>
      <span className="badge">{status}</span>
      <p>保單號碼：{policyNumber}</p>
    </div>
  );
};
```

---

## 4. AP Server 連線與對話動作處理 (API & Action Handling)

### 4.1 API 客戶端配置
環境變數由 Vite 提供（`VITE_API_BASE_URL`）：

```typescript
// src/services/api.client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true, // 支援憑證與 Cookie 傳遞
  headers: {
    'Content-Type': 'application/json'
  }
});

// 全域回應攔截器：統一解構 envelope 與處理 401 逾期
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 導向登入頁或觸發 Auth Store 清空狀態
      console.warn('使用者未授權或登入已過期');
    }
    return Promise.reject(error);
  }
);
```

### 4.2 意圖回應處理機制 (Action Handling)
當後端回傳 `type: "action"` 且 `action: "NAVIGATE"` 時，前端助理元件需觸發 React Router 進行動態跳轉：

```typescript
// src/hooks/useAssistant.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api.client';
import type { AssistantMessageResponse } from '../types/assistant';

export function useAssistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage(userText: string) {
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);

    try {
      const response: AssistantMessageResponse = await apiClient.post('/assistant/message', {
        message: userText
      });

      // 1. 純文字/卡片回應
      if (response.type === 'text') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.content,
            data: response.data
          }
        ]);
      }

      // 2. 動態行為導航 Action (NAVIGATE)
      if (response.type === 'action' && response.action === 'NAVIGATE') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.message || '即將為您轉跳頁面...'
          }
        ]);

        setTimeout(() => {
          const queryParams = new URLSearchParams(response.payload.params as any).toString();
          navigate(`${response.payload.route}?${queryParams}`);
        }, 1200);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '抱歉，系統目前處理繁忙，請稍後再試。'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return { messages, isLoading, sendMessage };
}
```
