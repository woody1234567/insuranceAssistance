import type { ClaimRequirementsResponseDTO, StartClaimResponseDTO } from "../models/dtos/claim.dto.js";
import type { ClaimDocument } from "../db/schema/claim-requirements.js";
import type { IClaimRequirementRepository } from "../repositories/claim-requirement.repository.js";
import type { IUserInsuranceRepository } from "../repositories/user-insurance.repository.js";
import { ClaimTemplate } from "../templates/claim.template.js";
import { AppError } from "../utils/app-error.js";

export class ClaimService {
  private readonly policyRepository: IUserInsuranceRepository;
  private readonly requirementRepository: IClaimRequirementRepository;

  public constructor(policyRepository: IUserInsuranceRepository, requirementRepository: IClaimRequirementRepository) {
    this.policyRepository = policyRepository;
    this.requirementRepository = requirementRepository;
  }

  public async getClaimRequirements(userId: string, claimType: string): Promise<ClaimRequirementsResponseDTO> {
    const policies = await this.policyRepository.findActiveByUserId(userId);
    const requirements = (
      await Promise.all(
        policies.map((policy) => this.requirementRepository.findByInsuranceAndType(policy.insuranceId, claimType)),
      )
    ).flat();

    const documents = this.mergeDocuments(requirements.flatMap((requirement) => requirement.requiredDocuments));
    if (documents.length === 0) {
      throw new AppError("找不到符合目前保單與理賠類型的文件規則", 404, "CLAIM_REQUIREMENTS_NOT_FOUND");
    }

    return {
      type: "text",
      intent: "claim_required_documents",
      content: ClaimTemplate.formatRequirements(claimType, documents),
      data: {
        claimType,
        requiredDocuments: documents,
        notes: [...new Set(requirements.flatMap((requirement) => requirement.notes ? [requirement.notes] : []))],
      },
    };
  }

  public async prepareClaim(userId: string): Promise<StartClaimResponseDTO> {
    const policies = await this.policyRepository.findActiveByUserId(userId);
    return {
      type: "action",
      intent: "start_claim",
      action: "NAVIGATE",
      payload: {
        route: "/claims/apply",
        params: {
          availablePolicyIds: policies.map((policy) => policy.policyNumber),
        },
      },
      message: policies.length > 0
        ? "已為您準備好理賠申請流程，即將開啟申請頁面..."
        : "您目前沒有可申請理賠的有效保單。",
    };
  }

  private mergeDocuments(documents: ClaimDocument[]): ClaimDocument[] {
    const merged = new Map<string, ClaimDocument>();
    for (const document of documents) {
      const existing = merged.get(document.name);
      merged.set(document.name, existing
        ? { ...existing, isOriginalRequired: existing.isOriginalRequired || document.isOriginalRequired }
        : document);
    }
    return [...merged.values()];
  }
}
