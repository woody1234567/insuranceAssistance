import type { ClaimDocument } from "../db/schema/claim-requirements.js";

const claimTypeNames: Record<string, string> = {
  accident: "意外",
  hospitalization: "住院",
  surgery: "手術",
};

export const ClaimTemplate = {
  formatRequirements(claimType: string, documents: ClaimDocument[]): string {
    const claimName = claimTypeNames[claimType] ?? claimType;
    const lines = documents.map(
      (document) => `- ${document.name}${document.isOriginalRequired ? "（正本）" : "（影本或依規定提供）"}`,
    );
    return `為您查詢${claimName}理賠所需準備文件清單如下：\n${lines.join("\n")}`;
  },
};
