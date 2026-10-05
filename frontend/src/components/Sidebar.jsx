import { useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { ChevronsLeft, LogoIcon, NewChatIcon, SettingsIcon } from "./Icons";

// 小圖示（用 currentColor，顏色由 CSS 控制）
const svgProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};
const PencilIcon = () => (
  <svg {...svgProps}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const TrashIcon = () => (
  <svg {...svgProps}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
  </svg>
);

export default function Sidebar({
  conversations,
  activeId,
  disabled, // 回覆生成中時，不讓使用者切換或修改對話
  onNew,
  onSelect,
  onCollapse,
  onRename,
  onDelete,
}) {
  const history = conversations.filter((c) => c.messages.length > 0);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null); // 等待使用者確認刪除的對話
  const skipCommit = useRef(false); // 按 Esc 取消時，不要把草稿存起來

  function startEdit(c) {
    setEditingId(c.id);
    setDraft(c.title);
  }

  function commitRename() {
    if (skipCommit.current) {
      skipCommit.current = false;
      return;
    }
    const title = draft.trim();
    if (title && editingId) onRename(editingId, title.slice(0, 16));
    setEditingId(null);
  }

  function handleRenameKeyDown(e) {
    // isComposing：中文輸入法選字時按 Enter 不算確認
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      skipCommit.current = true;
      setEditingId(null);
    }
  }

  function confirmDelete() {
    if (pendingDelete) onDelete(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <LogoIcon className="brand-logo" />
        <span className="brand-name">保單小助手</span>
        <button className="icon-btn" onClick={onCollapse} aria-label="收合側邊欄">
          <ChevronsLeft width={28} height={28} />
        </button>
      </div>

      <button className="new-chat" onClick={onNew} disabled={disabled}>
        <NewChatIcon width={28} height={28} />
        <span>新對話</span>
      </button>

      <div className="history-label">歷史對話</div>
      <ul className="history">
        {history.map((c) => (
          <li
            key={c.id}
            className={`history-row ${c.id === activeId ? "active" : ""}`}
          >
            {editingId === c.id ? (
              <input
                className="rename-input"
                autoFocus
                value={draft}
                maxLength={30}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={commitRename}
                aria-label="重新命名對話"
              />
            ) : (
              <>
                <button
                  className="history-item"
                  onClick={() => onSelect(c.id)}
                  disabled={disabled}
                >
                  {c.title}
                </button>
                <div className="history-actions">
                  <button
                    className="mini-btn"
                    onClick={() => startEdit(c)}
                    disabled={disabled}
                    aria-label={`重新命名「${c.title}」`}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    className="mini-btn"
                    onClick={() => setPendingDelete(c)}
                    disabled={disabled}
                    aria-label={`刪除「${c.title}」`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="user-box">
        <SettingsIcon width={28} height={28} />
        <span>User</span>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="刪除對話"
        message={`「${pendingDelete?.title ?? ""}」將被永久刪除，無法復原。`}
        confirmText="刪除"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </aside>
  );
}
