import { useEffect, useRef } from "react";

// 用瀏覽器內建的 <dialog>：自動處理遮罩、鎖定焦點、Esc 關閉
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "確定",
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault(); // 按 Esc：交給 onCancel 統一處理
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel(); // 點遮罩（對話框外面）= 取消
      }}
    >
      <div className="dialog-body">
        <h2 id="dialog-title" className="dialog-title">
          {title}
        </h2>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          {/* 取消放在前面，開啟時預設停在這顆，避免誤按 Enter 就刪除 */}
          <button className="dialog-btn" onClick={onCancel}>
            取消
          </button>
          <button className="dialog-btn danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}
