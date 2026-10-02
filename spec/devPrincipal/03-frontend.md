# 🖥️ 03 - 前端開發規範 (Vue 3)

本文件定義前端應用（Web Server）的開發標準、Vue 3 與 TypeScript 規範、狀態管理以及與後端 AP Server 的通訊整合機制。

---

## 1. 前端技術棧與定位 (Tech Stack & Role)

- **框架**：Vue 3（嚴格使用 **Composition API** 與 `<script setup lang="ts">`）
- **建置工具**：Vite
- **型別系統**：TypeScript (Strict Mode)
- **狀態管理**：Pinia
- **路由控制**：Vue Router (HTML5 History Mode)
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
│   │   │   ├── ChatMessage.vue
│   │   │   ├── ChatInput.vue
│   │   │   └── PolicyCard.vue
│   │   └── common/          # 通用元件 (Button, Modal, Loading)
│   ├── views/               # 頁面級別視圖 (Pages)
│   │   ├── AssistantView.vue  # 助理對話主畫面
│   │   ├── PoliciesView.vue   # 保單清單頁
│   │   └── ClaimApplyView.vue # 理賠申請表單頁
│   ├── composables/         # 業務邏輯組合式函式 (useChat, useAuth)
│   ├── stores/              # Pinia 狀態模組 (chat, user)
│   ├── router/              # Vue Router 路由定義
│   │   └── index.ts
│   ├── services/            # API 客戶端封裝 (Axios / Fetch)
│   │   └── api.client.ts
│   ├── types/               # 前端專屬 TypeScript 型別定義
│   │   ├── assistant.ts
│   │   └── policy.ts
│   ├── App.vue              # 應用根元件
│   └── main.ts              # 應用程式入口
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

### 3.1 SFC 結構與命名
- 檔名採用 **PascalCase**（如 `PolicyCard.vue`, `AssistantView.vue`）。
- 嚴格遵守 `<script setup lang="ts">` ➔ `<template>` ➔ `<style scoped>` 順序。

```vue
<script setup lang="ts">
import { computed } from 'vue';

// 定義 Props (採用 Type-based 語法)
interface Props {
  policyNumber: string;
  policyName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
}

const props = defineProps<Props>();

// 定義 Emits
const emit = defineEmits<{
  (e: 'select', policyNumber: string): void;
}>();

const isActive = computed(() => props.status === 'ACTIVE');

function handleClick() {
  emit('select', props.policyNumber);
}
</script>

<template>
  <div class="policy-card" :class="{ active: isActive }" @click="handleClick">
    <h3>{{ policyName }}</h3>
    <span class="badge">{{ status }}</span>
    <p>保單號碼：{{ policyNumber }}</p>
  </div>
</template>

<style scoped>
.policy-card {
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
}
.policy-card.active {
  border-color: #3b82f6;
}
</style>
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
當後端回傳 `type: "action"` 且 `action: "NAVIGATE"` 時，前端助理元件需觸發 Vue Router 進行動態跳轉：

```typescript
// src/composables/useAssistant.ts
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient } from '../services/api.client.js';
import type { AssistantMessageResponse } from '../types/assistant.js';

export function useAssistant() {
  const router = useRouter();
  const messages = ref<any[]>([]);
  const isLoading = ref(false);

  async function sendMessage(userText: string) {
    isLoading.value = true;
    messages.value.push({ role: 'user', content: userText });

    try {
      const response: AssistantMessageResponse = await apiClient.post('/assistant/message', {
        message: userText
      });

      // 1. 純文字/卡片回應
      if (response.type === 'text') {
        messages.value.push({
          role: 'assistant',
          content: response.content,
          data: response.data
        });
      }

      // 2. 動態行為導航 Action (NAVIGATE)
      if (response.type === 'action' && response.action === 'NAVIGATE') {
        messages.value.push({
          role: 'assistant',
          content: response.message || '即將為您轉跳頁面...'
        });

        setTimeout(() => {
          router.push({
            path: response.payload.route,
            query: response.payload.params
          });
        }, 1200);
      }
    } catch (err) {
      messages.value.push({
        role: 'assistant',
        content: '抱歉，系統目前處理繁忙，請稍後再試。'
      });
    } finally {
      isLoading.value = false;
    }
  }

  return { messages, isLoading, sendMessage };
}
```
