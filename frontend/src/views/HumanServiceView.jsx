import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SendIcon } from "../components/Icons";
import "../App.css";

const INITIAL_GREETING =
  "親愛的顧客您好，我是線上客服專員 林心怡（工號：CS-8821），很高興為您服務！請問今天有什麼我可以協助您的？";

const QUICK_SERVICE_CHIPS = [
  { label: "保單借款諮詢", text: "我想了解保單借款的申請條件與利率" },
  { label: "變更受益人 / 地址", text: "如何辦理保單受益人或通訊地址變更？" },
  { label: "保單解約諮詢", text: "我想詢問保單解約手續與應備文件" },
  { label: "理賠爭議處理", text: "我有理賠核定結果的疑問想要諮詢" },
];

function getSimulatedReply(userText) {
  const t = userText.toLowerCase();

  if (t.includes("借款") || t.includes("貸款") || t.includes("借錢")) {
    return "關於保單借款，年利率目前依險種約為 3.5% ~ 6.9%，通常可借金額為保單價值準備金的 7 ~ 9 成。\n\n如需辦理，您可以：\n1. 透過官網或行動銀行『線上保單借款專區』申辦，最快 10 分鐘入帳。\n2. 攜帶雙證件及存摺親至全台各分行櫃檯臨櫃辦理。\n請問您需要為您查詢哪一張保單呢？";
  }

  if (
    t.includes("受益人") ||
    t.includes("地址") ||
    t.includes("電話") ||
    t.includes("變更") ||
    t.includes("改")
  ) {
    return "保單資料變更（受益人、通訊地址、聯絡電話）處理說明如下：\n\n1. 變更受益人：需填寫『保全契約變更申請書』，要保人與被保險人皆須親簽，並檢附身分證明文件送件。\n2. 地址 / 電話變更：若已開通網路會員，可直接於線上會員專區完成修改；或郵寄申請書辦理。\n需要我提供申請表格下載連結給您嗎？";
  }

  if (t.includes("解約") || t.includes("退保") || t.includes("停效")) {
    return "提醒您，保單解約將會終止保障權益，且解約金通常低於已繳保費，可能造成本金損失。\n\n若您目前面臨資金週轉需求，亦可考慮『保單借款』、『減額繳清』或『展期定期保險』等彈性方案，以維持基本保障。\n若您仍確定需要解約，請填妥『終止保險契約申請書』並檢附身分證影本及本人存摺封面影本送件辦理。";
  }

  if (
    t.includes("爭議") ||
    t.includes("申訴") ||
    t.includes("抱怨") ||
    t.includes("不服") ||
    t.includes("理賠不公")
  ) {
    return "非常抱歉造成您的困擾與不便。本公司高度重視顧客權益，針對理賠審核若有爭議，我們設有獨立申訴審議流程。\n\n您可以隨時致電客戶服務申訴專線：0800-000-123（轉接專責主管），或留下您的聯絡電話與保單號碼，我會立即為您呈報專案主管並於 1 個工作天內主動致電與您詳細說明。";
  }

  if (
    t.includes("你好") ||
    t.includes("您好") ||
    t.includes("嗨") ||
    t.includes("在嗎") ||
    t.includes("真人") ||
    t.includes("專員")
  ) {
    return "您好！我是線上專屬客服專員，在線為您服務中。您可以直接告訴我您遇到的問題或想諮詢的業務事項，我會盡快為您提供解答！";
  }

  return "感謝您的詳細說明！這項問題我已為您記錄。若您希望專人直接以電話向您詳細解說，可留下您的聯絡電話與方便接聽時段；亦可於上班時間（週一至週五 09:00 - 18:00）撥打客服專線 0800-000-123，將有專責窗口為您服務。";
}

function getCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function HumanServiceView() {
  const [messages, setMessages] = useState(() => [
    {
      id: "init",
      role: "agent",
      text: INITIAL_GREETING,
      time: getCurrentTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function sendUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      time: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // 模擬專員思考與打字延遲 (900ms ~ 1300ms)
    setTimeout(() => {
      const replyText = getSimulatedReply(trimmed);
      const agentMsg = {
        id: crypto.randomUUID(),
        role: "agent",
        text: replyText,
        time: getCurrentTime(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsTyping(false);
    }, 1100);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendUserMessage(input);
    }
  }

  return (
    <div className="human-service-container">
      {/* 頂部專員與導航 Header */}
      <header className="human-service-header">
        <div className="human-agent-profile">
          <div className="human-avatar-wrapper">
            <svg
              className="human-avatar-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 18v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="human-status-indicator" title="在線中" />
          </div>
          <div className="human-agent-details">
            <div className="human-agent-title">
              <span className="human-agent-name">專員 林心怡</span>
              <span className="human-badge">在線服務中</span>
            </div>
            <div className="human-agent-sub">
              工號：CS-8821 ｜ 客服諮詢專線：0800-000-123
            </div>
          </div>
        </div>

        <Link to="/" className="back-assistant-btn">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回智慧助理
        </Link>
      </header>

      {/* 對話訊息區 */}
      <main className="human-messages-area">
        <div className="human-messages-list">
          {messages.map((m) =>
            m.role === "agent" ? (
              <div key={m.id} className="row assistant human-row">
                <div className="human-bubble-wrapper">
                  <div className="bubble human-bubble agent">
                    {m.text}
                    {m.id === "init" && (
                      <div className="chips-inline human-chips">
                        {QUICK_SERVICE_CHIPS.map((chip) => (
                          <button
                            key={chip.label}
                            className="chip"
                            disabled={isTyping}
                            onClick={() => sendUserMessage(chip.text)}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="message-timestamp">{m.time}</span>
                </div>
              </div>
            ) : (
              <div key={m.id} className="row user human-row">
                <div className="human-bubble-wrapper user">
                  <div className="bubble human-bubble user">{m.text}</div>
                  <span className="message-timestamp user">{m.time}</span>
                </div>
              </div>
            ),
          )}

          {isTyping && (
            <div className="row assistant human-row">
              <div className="bubble human-bubble agent typing">
                <span className="typing-text">專員正在輸入中</span>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 底部輸入列 */}
        <div className="composer human-composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTyping ? "專員回覆中，請稍候..." : "請輸入您的問題或需求說明"}
            aria-label="輸入訊息"
            maxLength={2000}
          />
          <button
            className="send-btn"
            onClick={() => sendUserMessage(input)}
            disabled={isTyping || !input.trim()}
            aria-label="送出"
          >
            <SendIcon width={36} height={36} />
          </button>
        </div>
      </main>
    </div>
  );
}
