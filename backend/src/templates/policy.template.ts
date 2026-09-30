import type { PolicySummary } from "../models/dtos/policy.dto.js";

export const PolicyTemplate = {
  formatList(policies: PolicySummary[]): string {
    if (policies.length === 0) {
      return "您目前沒有有效保單。";
    }

    const lines = policies.map((policy, index) => `${index + 1}. ${policy.name}（${policy.status}）`);
    return `您目前共有 ${policies.length} 張有效保單：\n${lines.join("\n")}`;
  },
};
