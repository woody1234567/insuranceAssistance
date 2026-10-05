import { useEffect, useState } from "react";
import {
  ApiError,
  getFriendlyErrorMessage,
  postAssistantMessage,
} from "../services/api.client";

const STORAGE_KEY = "conversations";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 後端要求補充理賠類型時，提供的選項
const CLAIM_TYPES = ["住院", "意外", "手術"];

// 後端目前沒有「歷史對話」API，所以先存在瀏覽器 localStorage
// 訊息格式：{ role, text, isError?, retryText?, policies?, followUps? }
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
const createConversation = () => ({
  id: crypto.randomUUID(),
  title: "新對話",
  messages: [],
});

export function useAssistant() {
  const [conversations, setConversations] = useState(() => {
    const saved = load();
    return saved.length ? saved : [createConversation()];
  });
  const [activeId, setActiveId] = useState(() => conversations[0].id);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  const active =
    conversations.find((c) => c.id === activeId) ?? conversations[0];

  // 修改指定對話的訊息（用 id 指定，避免打字途中切換對話寫錯地方）
  const updateMessages = (id, fn) =>
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, messages: fn(c.messages) } : c)),
    );

  // 為最後一則訊息附加資料（保單清單、跳轉按鈕…）
  const attachToLast = (id, extra) =>
    updateMessages(id, (m) => {
      const next = [...m];
      next[next.length - 1] = { ...next[next.length - 1], ...extra };
      return next;
    });

  // 收到回應後，才新增系統訊息並一個字一個字顯示
  async function typeOut(id, text) {
    updateMessages(id, (m) => [...m, { role: "assistant", text: "" }]);
    for (const ch of text) {
      updateMessages(id, (m) => {
        const next = [...m];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, text: last.text + ch };
        return next;
      });
      await sleep(20);
    }
  }

  // 向後端要回覆（送出訊息與「重新傳送」共用）
  async function requestReply(id, userText) {
    setIsLoading(true);
    try {
      const res = await postAssistantMessage(userText);

      if (res.type === "text") {
        if (res.intent === "redirect_to_human") {
          await typeOut(id, res.content || "我無法回答您這項問題，請您尋求專人服務。");
          return;
        }
        const policies =
          res.intent === "list_user_policies" ? res.data?.policies : null;
        if (policies?.length) {
          await typeOut(id, res.content.split("\n")[0]);
          attachToLast(id, { policies });
        } else {
          await typeOut(id, res.content);
        }
      } else {
        // 其他類型的回應（例如後端要求跳轉頁面）：前端不處理跳轉，只顯示後端的文字
        await typeOut(id, res.message ?? "抱歉，我暫時無法處理這個要求。");
      }
    } catch (err) {
      // 後端需要使用者補充資料，這不是故障：把後端的提問顯示出來，並提供選項
      if (err instanceof ApiError && err.code === "CLAIM_TYPE_REQUIRED") {
        await typeOut(id, err.message);
        attachToLast(id, {
          followUps: CLAIM_TYPES.map((t) => ({
            label: t,
            text: `${t}理賠需要準備哪些文件？`,
          })),
        });
        return;
      }
      console.error(err); // 技術細節留在 console，給工程師除錯用
      updateMessages(id, (m) => [
        ...m,
        {
          role: "assistant",
          text: getFriendlyErrorMessage(err),
          isError: true,
          retryText: userText, // 讓「重新傳送」知道要再送什麼
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function sendMessage(userText) {
    const id = active.id;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              title: c.messages.length === 0 ? userText.slice(0, 16) : c.title,
              messages: [...c.messages, { role: "user", text: userText }],
            }
          : c,
      ),
    );
    await requestReply(id, userText);
  }

  // 重新傳送：移除最後的錯誤訊息，再送一次同樣的問題（不會重複出現使用者訊息）
  function retry() {
    const last = active.messages[active.messages.length - 1];
    if (isLoading || !last?.isError || !last.retryText) return;
    updateMessages(active.id, (m) => m.slice(0, -1));
    requestReply(active.id, last.retryText);
  }

  function newConversation() {
    if (active.messages.length === 0) return;
    const c = createConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
  }

  function renameConversation(id, title) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  }

  function deleteConversation(id) {
    const rest = conversations.filter((c) => c.id !== id);
    const next = rest.length ? rest : [createConversation()];
    setConversations(next);
    if (id === activeId) setActiveId(next[0].id); // 刪掉正在看的，就切到下一則
  }

  return {
    conversations,
    activeId: active.id,
    messages: active.messages,
    isLoading,
    sendMessage,
    retry,
    newConversation,
    selectConversation: setActiveId,
    renameConversation,
    deleteConversation,
  };
}
