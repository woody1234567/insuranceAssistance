// 開發時由 vite.config.js 的 proxy 轉發到後端
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

// 目前沒有登入功能，先使用資料庫中的使用者 ID
const USER_ID =
  import.meta.env.VITE_USER_ID ?? "00000000-0000-0000-0000-000000000001";

// status = 0 代表根本沒連上伺服器（斷網、伺服器沒開等）
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code; // 後端的錯誤代碼，例如 CLAIM_TYPE_REQUIRED
  }
}

// 把技術性的錯誤轉成使用者看得懂的說明（技術細節留在 console）
export function getFriendlyErrorMessage(err) {
  const status = err instanceof ApiError ? err.status : -1;
  if (status === 0) return "目前無法連線到伺服器，請檢查網路連線後再試一次。";
  if (status === 400) return "您輸入的內容無法處理，請修改後再試一次。";
  if (status === 401) return "您尚未登入或登入已失效，請重新登入後再試。";
  if (status === 429) return "目前詢問的人較多，請稍候一分鐘再試。";
  if (status === 502 || status === 503 || status === 504) {
    return "系統正在維護或暫時忙碌中，請稍後再試。";
  }
  if (status >= 500) return "系統發生問題，請稍後再試一次。若持續發生，請聯絡客服。";
  return "發生未預期的問題，請稍後再試。";
}

export async function postAssistantMessage(message) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/assistant/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": USER_ID, // 後端 auth.middleware.ts 讀這個
      },
      body: JSON.stringify({ message }),
    });
  } catch {
    throw new ApiError("無法連線到伺服器", 0);
  }

  const json = await res.json().catch(() => null);

  // 後端錯誤格式：{ success:false, error:{ code, message } }
  if (!res.ok || !json?.success) {
    throw new ApiError(
      json?.error?.message ?? `HTTP ${res.status}`,
      res.status,
      json?.error?.code,
    );
  }
  return json.data; // 拆掉 { success, data, meta } 外層
}
