# 系統架構規範 (System Architecture Specification)

此目錄存放「保險智慧助理」系統的整體硬體與網路實體拓撲架構圖與架構設計文件。

## 文件清單

- [system-architecture.md](file:///home/woody/small_projects/insuranceAssistance/spec/Architecture/system-architecture.md)：包含完整實體部署 Mermaid 架構圖（3 Web Servers -> Load Balancer -> 3 AP Servers -> Gemini API & Database）與硬體元件分工說明。
- [backend-flowchart.md](file:///home/woody/small_projects/insuranceAssistance/spec/Architecture/backend-flowchart.md)：包含 `POST /assistant/message` 請求生命週期、5 種 AI 意圖分支及一路打至資料庫的流程圖（Request ➔ Middlewares ➔ Controller ➔ AI 意圖分派 ➔ Repository ➔ DB）。

