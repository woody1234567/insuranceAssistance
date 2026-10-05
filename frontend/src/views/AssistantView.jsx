import { useEffect, useRef, useState } from "react";
import { useAssistant } from "../hooks/useAssistant";
import { ChevronsRight, RobotIcon, SendIcon } from "../components/Icons";
import PolicyList from "../components/PolicyList";
import Sidebar from "../components/Sidebar";
import "../App.css";

const GREETING = "親愛的顧客您好，很高興為您服務";

// 快捷問題：label 是按鈕上的字，text 是實際送給後端的問題
const QUICK_QUESTIONS = [
  { label: "查詢我的保單", text: "我想知道我有幾張保單" },
  { label: "理賠需要哪些文件", text: "理賠需要準備哪些文件？" },
];

export default function AssistantView() {
  const {
    conversations,
    activeId,
    messages,
    isLoading,
    sendMessage,
    retry,
    newConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
  } = useAssistant();
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, activeId]);

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  }

  function handleKeyDown(e) {
    // isComposing：中文輸入法選字時按 Enter 不送出
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  const assistantRow = (
    text,
    key,
    { isError, policies, followUps, isLast } = {},
  ) => (
    <div key={key} className="row assistant">
      <RobotIcon className="avatar" />
      <div className={`bubble ${isError ? "error" : ""}`}>
        {text}
        {policies && <PolicyList policies={policies} />}
        {followUps && isLast && !isLoading && (
          <div className="chips-inline">
            {followUps.map((f) => (
              <button
                key={f.label}
                className="chip"
                onClick={() => sendMessage(f.text)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        {isError && isLast && !isLoading && (
          <button className="action-btn" onClick={retry}>
            重新傳送
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="app">
      {!collapsed && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          disabled={isLoading}
          onNew={newConversation}
          onSelect={selectConversation}
          onCollapse={() => setCollapsed(true)}
          onRename={renameConversation}
          onDelete={deleteConversation}
        />
      )}

      <main className="main">
        {collapsed && (
          <button
            className="icon-btn expand-btn"
            onClick={() => setCollapsed(false)}
            aria-label="展開側邊欄"
          >
            <ChevronsRight width={28} height={28} />
          </button>
        )}

        <div className="messages">
          {assistantRow(GREETING)}

          {/* 還沒開始對話時，顯示快捷問題 */}
          {messages.length === 0 && (
            <div className="chips">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  className="chip"
                  disabled={isLoading}
                  onClick={() => sendMessage(q.text)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "assistant" ? (
              assistantRow(m.text, i, { ...m, isLast: i === messages.length - 1 })
            ) : (
              <div key={i} className="row user">
                <div className="bubble">{m.text}</div>
              </div>
            ),
          )}
          <div ref={bottomRef} />
        </div>

        <div className="composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "查詢中，請稍候…" : "請輸入您的問題"}
            aria-label="輸入訊息"
            maxLength={2000}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            aria-label="送出"
          >
            <SendIcon width={36} height={36} />
          </button>
        </div>
      </main>
    </div>
  );
}
