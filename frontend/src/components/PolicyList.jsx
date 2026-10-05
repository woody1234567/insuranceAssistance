// 保單狀態：後端回傳英文代碼，這裡轉成中文標籤
const STATUS = {
  ACTIVE: { label: "✓ 有效", tone: "ok" },
  EXPIRED: { label: "已到期", tone: "off" },
  TERMINATED: { label: "已終止", tone: "off" },
  SUSPENDED: { label: "暫停中", tone: "warn" },
};

export default function PolicyList({ policies }) {
  return (
    <ul className="policy-list">
      {policies.map((p) => {
        const s = STATUS[p.status] ?? { label: p.status, tone: "off" };
        return (
          <li key={p.id} className="policy-item">
            <span className="policy-name">{p.name}</span>
            <span className={`badge ${s.tone}`}>{s.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
