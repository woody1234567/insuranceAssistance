# 📊 AI 意圖評估框架與驗證準則 (AI Intent Evaluation Principles)

本文件定義「保險智慧助理 (Insurance Assistance)」專案中 **AI 意圖分類器 (Intent Classifier)** 的獨立評估架構、測試資料集規範、量化指標計算標準以及持續驗證流程。

---

## 🧭 設計理念與核心原則 (Design Principles)

1. **純函式與獨立服務解耦 (Decoupled & Standalone Testing)**：
   - AI 意圖分類器測試必須完全解耦 Express API、MySQL/Cloud SQL 資料庫、中介層與業務邏輯層。
   - 評估流程只專注測量「Gemini 模型在真實對話情境下的語意理解與分類準確率」，排除任何網路 I/O 或後端服務連線的干擾。

2. **真實對話多樣性與真實場景測試 (Data-Driven & Diversity)**：
   - 測試資料集嚴禁僅包含教科書式的「標準問句」。
   - 資料集必須涵蓋高頻且多樣的真實口語句型：
     - **標準問句**（如「我要申請醫療理賠需要準備什麼？」）
     - **口語短句**（如「我要賠」、「查保單」）
     - **錯字與同音字**（如「保但清單」、「理陪」）
     - **語意邊界模糊問法**（如「理賠要準備什麼才能申請」vs「我要申請理賠」）
     - **非支援保險業務**（如「我要變更通訊地址」、「我想辦保單借款」）
     - **離題與日常問候**（如「今天天氣如何」、「寫一首詩」、「早安」）

3. **嚴謹的多維度量化指標 (Quantitative Rigor)**：
   - 不得僅以整體準確率（Overall Accuracy）作為衡量標準，必須同時具備：
     - **Confusion Matrix（混淆矩陣）**：分析哪兩種意圖最容易互相混淆。
     - **Precision、Recall、F1-score**：細分各類別表現，並計算 Macro Average 與 Weighted Average。
     - **次分類準確率 (ClaimType Accuracy)**：理賠文件細項分類（住院 / 意外 / 手術）的提取正確率。
     - **多輪穩定度一致率 (Multi-run Stability)**：評估生成式模型在相同輸入下的推論一致性。

4. **提示詞工程版本化與 A/B 測試 (Versioned Prompts & A/B Testing)**：
   - System Prompt 統一抽離版本化管理（`SYSTEM_PROMPT_V1`, `SYSTEM_PROMPT_V2`...）。
   - 提示詞的每一次迭代修改必須有量化數據支持，透過 A/B 測試對比評估結果，以實驗數據取代主觀感覺。

---

## 📂 評估模組目錄結構

評估工具與生產代碼目錄分離，保持後端架構精簡純粹：

```
backend/
├── evaluation/
│   ├── datasets/
│   │   └── intent-test-cases.json      # 125 筆標準標註資料集
│   ├── types.ts                        # 評估資料模型與型別定義
│   ├── metrics.ts                      # 指標運算、混淆矩陣建構與報表渲染
│   ├── evaluate.ts                     # CLI 執行工具 (支援並發控制、重試、匯出)
│   └── results/                        # 自動匯出之量化評估報告
│       ├── latest-result.json          # 評估原始資料 JSON
│       ├── latest-confusion-matrix.csv # 混淆矩陣 CSV
│       └── latest-summary.md           # 格式化 Markdown 摘要
├── src/
│   └── ai/
│       ├── intent-classifier.ts        # 生產意圖分類器 (支援可注入 promptOverride)
│       └── prompts/
│           └── intent-prompts.ts       # 版本化 System Prompts (V1, V2)
└── package.json                        # 評估 CLI 指令整合
```

---

## 🏷️ 意圖類別與標註規範

評估資料集嚴格對齊專案目前上線運作的 5 大意圖：

| 意圖名稱 (`expectedIntent`) | 次分類 (`expectedClaimType`) | 業務定義與行為範疇 |
| :--- | :--- | :--- |
| `list_user_policies` | `null` | 查詢名下保單張數、查看保單清單、檢視投保內容。 |
| `claim_required_documents` | `hospitalization` / `accident` / `surgery` / `null` | 詢問特定情境下申請理賠所須檢附之證明文件與收據明細。 |
| `start_claim` | `null` | 使用者表達希望開始、進入、辦理、申請或送件理賠流程。 |
| `redirect_to_human` | `null` | 要求真人專人客服，或提出目前系統尚未支援之複雜保險業務（如保單借款、改地址、變更受益人、解約、爭議申訴）。 |
| `unknown` | `null` | 日常打招呼問候、完全無關的閒聊（天氣、股票、編程、翻譯）或無意義字串符號。 |

### 資料集格式範例 (`intent-test-cases.json`)

```json
[
  {
    "id": "DOC-ACC-001",
    "text": "車禍受傷意外理賠要準備什麼文件？",
    "expectedIntent": "claim_required_documents",
    "expectedClaimType": "accident",
    "category": "standard"
  },
  {
    "id": "CLM-005",
    "text": "我要賠",
    "expectedIntent": "start_claim",
    "expectedClaimType": null,
    "category": "short"
  },
  {
    "id": "UNK-001",
    "text": "今天台北天氣如何？會下雨嗎？",
    "expectedIntent": "unknown",
    "expectedClaimType": null,
    "category": "out_of_domain"
  }
]
```

---

## 📐 量化指標運算標準

指標計算模組實作於 [`backend/evaluation/metrics.ts`](file:///home/woody/small_projects/insuranceAssistance/backend/evaluation/metrics.ts)：

### 1. 混淆矩陣 (Confusion Matrix)
橫列為實際標籤（Actual），直行為模型預測（Predicted）：
```
Actual \ Pred      POLICIES   DOCUMENTS   START_CLM       HUMAN     UNKNOWN
---------------------------------------------------------------------------
POLICIES                  7           0           0           0           0
DOCUMENTS                 0           7           0           0           0
START_CLM                 0           0           7           0           0
HUMAN                     0           0           0           7           0
UNKNOWN                   0           0           0           0           7
```
> 若發生誤判，混淆矩陣能立刻指出「哪兩類意圖邊界定義不清」（例如 `UNKNOWN` 容易被判成 `HUMAN`）。

### 2. 類別評估指標
對每個意圖類別 $C$：
- $\text{Precision} = \frac{TP}{TP + FP}$
- $\text{Recall} = \frac{TP}{TP + FN}$
- $\text{F1-Score} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$

### 3. 整體評估
- **Overall Accuracy**：$\frac{\sum TP}{N}$
- **Macro Average**：所有類別指標的算術平均數（各類別等權重）。
- **Weighted Average**：依據各類別樣本數進行加權平均。
- **Claim Type 條件準確率**：在 `claim_required_documents` 意圖下，次分類（住院/意外/手術）的判斷準確率。
- **多輪穩定一致率 (Multi-run Stability Consistency Rate)**：針對同一個測試語句連續執行 $K$ 次（預設 3 次），模型輸出完全相同意圖之比例。

---

## 🚀 評估指令與操作指南

在 `backend` 目錄下執行：

```bash
# 1. 執行標準評估（全量 125 筆資料）
pnpm eval:intent

# 2. 分層抽樣快速驗證（抽取各類別平均共 20 筆，避免 API 費用與等待時間）
pnpm eval:intent --limit 20

# 3. 測試多輪模型穩定性（每個 Case 重複測試 3 次，計算一致性比率）
pnpm eval:intent:stability --limit 10

# 4. 指定 Prompt 版本進行 A/B 測試
pnpm eval:intent --prompt v1 --limit 10
pnpm eval:intent --prompt v2 --limit 10

# 5. 自訂並發量與 API 請求延遲（保護 Vertex AI Quota）
pnpm eval:intent --concurrency 3 --delay 200
```

### 自動輸出報告
每次執行評估完畢後，結果自動儲存於 `backend/evaluation/results/`：
- **`latest-summary.md`**：Markdown 格式總結，包含指標表、混淆矩陣與詳細錯誤案例表（Bad Cases）。
- **`latest-confusion-matrix.csv`**：混淆矩陣 CSV 格式，適合直接匯入試算表繪製圖表。
- **`latest-result.json`**：完整結構化預測數據與各筆詳細反應時間。

---

## 💡 Prompt A/B 測試實務案例

本專案在建立評估工具時，成功利用該框架發現並修復了重大 Prompt 邊界混淆：

1. **問題發現 (Prompt V1)**：
   - 原始提示詞寫道：「*如詢問無關主題、一般問候、或無法確定請使用 redirect_to_human*」。
   - 導致評估工具回報 `UNKNOWN` 樣本（如「今天台北天氣如何？」、「你好」）有 100% 誤判為 `redirect_to_human`，整體準確率僅 80%。
2. **優化修復 (Prompt V2)**：
   - 將「轉介真人」明確限縮於「明確要求專人」或「未支援的複雜保險業務（如保單借款、改地址）」。
   - 將「日常問候、無關閒聊、亂碼」明確歸類至 `unknown`。
3. **驗證成效**：
   - 抽樣實測準確率由 **80.0%** 提升至 **100.0%**。
   - 3 輪跨次穩定性一致率達到 **100.0%**。
