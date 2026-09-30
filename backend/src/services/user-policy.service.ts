import type { PolicyResponseDTO, PolicySummary } from "../models/dtos/policy.dto.js";
import type { IUserInsuranceRepository } from "../repositories/user-insurance.repository.js";
import { PolicyTemplate } from "../templates/policy.template.js";

export class UserPolicyService {
  private readonly policyRepository: IUserInsuranceRepository;

  public constructor(policyRepository: IUserInsuranceRepository) {
    this.policyRepository = policyRepository;
  }

  public async getUserPolicies(userId: string): Promise<PolicyResponseDTO> {
    const rawPolicies = await this.policyRepository.findActiveByUserId(userId);
    const policies: PolicySummary[] = rawPolicies.map((policy) => ({
      id: policy.policyNumber,
      name: policy.insuranceName,
      status: policy.status,
      type: policy.insuranceType,
    }));

    return {
      type: "text",
      intent: "list_user_policies",
      content: PolicyTemplate.formatList(policies),
      data: {
        totalPolicies: policies.length,
        policies,
      },
    };
  }
}
