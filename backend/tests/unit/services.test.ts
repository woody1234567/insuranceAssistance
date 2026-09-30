import { describe, expect, it, vi } from "vitest";
import { ClaimService } from "../../src/services/claim.service.js";
import { UserPolicyService } from "../../src/services/user-policy.service.js";
import type { IClaimRequirementRepository } from "../../src/repositories/claim-requirement.repository.js";
import type { IUserInsuranceRepository } from "../../src/repositories/user-insurance.repository.js";

function policyRepository(): IUserInsuranceRepository {
  return {
    findActiveByUserId: vi.fn().mockResolvedValue([
      {
        id: "policy-1",
        userId: "user-1",
        insuranceId: "INS-HEALTH-001",
        policyNumber: "POL-HEALTH-2025-0001",
        status: "ACTIVE",
        startDate: "2025-01-01",
        endDate: "2035-12-31",
        insuranceName: "守護醫療健康保險",
        insuranceType: "HEALTH",
      },
      {
        id: "policy-2",
        userId: "user-1",
        insuranceId: "INS-LIFE-001",
        policyNumber: "POL-LIFE-2025-0001",
        status: "ACTIVE",
        startDate: "2025-01-01",
        endDate: "2045-12-31",
        insuranceName: "安心終身壽險",
        insuranceType: "LIFE",
      },
    ]),
  };
}

describe("UserPolicyService", () => {
  it("maps repository policies into the assistant response", async () => {
    const result = await new UserPolicyService(policyRepository()).getUserPolicies("user-1");

    expect(result.data.totalPolicies).toBe(2);
    expect(result.data.policies[0]).toEqual({
      id: "POL-HEALTH-2025-0001",
      name: "守護醫療健康保險",
      status: "ACTIVE",
      type: "HEALTH",
    });
    expect(result.content).toContain("您目前共有 2 張有效保單");
  });
});

describe("ClaimService", () => {
  it("merges duplicate documents across active policies", async () => {
    const requirements: IClaimRequirementRepository = {
      findByInsuranceAndType: vi.fn().mockResolvedValue([
        {
          id: "requirement-1",
          insuranceId: "INS-HEALTH-001",
          claimType: "hospitalization",
          requiredDocuments: [
            { name: "醫療診斷證明書", isOriginalRequired: false, description: "影本" },
            { name: "保險理賠申請書", isOriginalRequired: false, description: "申請書" },
          ],
          notes: "請保留收據正本",
        },
      ]),
    };
    const result = await new ClaimService(policyRepository(), requirements)
      .getClaimRequirements("user-1", "hospitalization");

    expect(result.data.requiredDocuments).toHaveLength(2);
    expect(result.data.notes).toEqual(["請保留收據正本"]);
    expect(result.content).toContain("住院理賠");
  });

  it("returns a navigation action with active policy numbers", async () => {
    const emptyRequirements: IClaimRequirementRepository = {
      findByInsuranceAndType: vi.fn(),
    };
    const result = await new ClaimService(policyRepository(), emptyRequirements).prepareClaim("user-1");

    expect(result.action).toBe("NAVIGATE");
    expect(result.payload).toEqual({
      route: "/claims/apply",
      params: {
        availablePolicyIds: ["POL-HEALTH-2025-0001", "POL-LIFE-2025-0001"],
      },
    });
  });
});
