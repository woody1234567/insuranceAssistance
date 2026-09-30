import { describe, expect, it, vi } from "vitest";
import { IntentRouter } from "../../src/ai/intent-router.js";
import type { IntentClassifier } from "../../src/ai/intent-classifier.js";
import type { IClaimRequirementRepository } from "../../src/repositories/claim-requirement.repository.js";
import type { IUserInsuranceRepository } from "../../src/repositories/user-insurance.repository.js";
import { AssistantService } from "../../src/services/assistant.service.js";
import { ClaimService } from "../../src/services/claim.service.js";
import { UserPolicyService } from "../../src/services/user-policy.service.js";

const policies = [
  {
    id: "policy-health",
    userId: "user-1",
    insuranceId: "INS-HEALTH-001",
    policyNumber: "POL-HEALTH-2025-0001",
    status: "ACTIVE",
    startDate: "2025-01-01",
    endDate: "2035-12-31",
    insuranceName: "守護醫療健康保險",
    insuranceType: "HEALTH",
  },
];

function createAssistant(classification: Awaited<ReturnType<IntentClassifier["classify"]>>): AssistantService {
  const policyRepository: IUserInsuranceRepository = {
    findActiveByUserId: vi.fn().mockResolvedValue(policies),
  };
  const claimRepository: IClaimRequirementRepository = {
    findByInsuranceAndType: vi.fn().mockResolvedValue([
      {
        id: "requirement-1",
        insuranceId: "INS-HEALTH-001",
        claimType: "hospitalization",
        requiredDocuments: [
          { name: "醫療診斷證明書", isOriginalRequired: true, description: "正本證明書" },
        ],
        notes: "請保留收據正本",
      },
    ]),
  };
  const classifier: IntentClassifier = {
    classify: vi.fn().mockResolvedValue(classification),
  };
  const policyService = new UserPolicyService(policyRepository);
  const claimService = new ClaimService(policyRepository, claimRepository);
  return new AssistantService(classifier, new IntentRouter(policyService, claimService));
}

describe("assistant core flows", () => {
  it("routes policy questions to the policy service", async () => {
    const result = await createAssistant({
      intent: "list_user_policies",
      claimType: null,
      confidence: 0.99,
    }).handleMessage("user-1", "我有幾張保單？");

    expect(result.intent).toBe("list_user_policies");
    expect(result.data).toMatchObject({ totalPolicies: 1 });
  });

  it("routes document questions to the claim service", async () => {
    const result = await createAssistant({
      intent: "claim_required_documents",
      claimType: "hospitalization",
      confidence: 0.98,
    }).handleMessage("user-1", "住院理賠需要什麼文件？");

    expect(result.intent).toBe("claim_required_documents");
    expect(result.data.requiredDocuments[0]?.name).toBe("醫療診斷證明書");
  });

  it("routes claim requests to the navigation action", async () => {
    const result = await createAssistant({
      intent: "start_claim",
      claimType: null,
      confidence: 0.97,
    }).handleMessage("user-1", "我要申請理賠");

    expect(result).toMatchObject({
      intent: "start_claim",
      type: "action",
      action: "NAVIGATE",
      payload: { route: "/claims/apply" },
    });
  });
});
