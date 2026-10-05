import type {
  AssistantResponseDTO,
  RedirectToHumanResponseDTO,
  UnknownIntentResponseDTO,
} from "../models/dtos/assistant.dto.js";
import type { ClaimService } from "../services/claim.service.js";
import type { UserPolicyService } from "../services/user-policy.service.js";
import type { IntentClassification } from "./intent-classifier.js";
import { AppError } from "../utils/app-error.js";

export class IntentRouter {
  private readonly policyService: UserPolicyService;
  private readonly claimService: ClaimService;

  public constructor(
    policyService: UserPolicyService,
    claimService: ClaimService,
  ) {
    this.policyService = policyService;
    this.claimService = claimService;
  }

  public async route(
    userId: string,
    classification: IntentClassification,
  ): Promise<AssistantResponseDTO> {
    switch (classification.intent) {
      case "list_user_policies":
        return this.policyService.getUserPolicies(userId);
      case "claim_required_documents":
        if (!classification.claimType) {
          throw new AppError(
            "請提供理賠類型，例如住院、意外或手術",
            400,
            "CLAIM_TYPE_REQUIRED",
          );
        }
        return this.claimService.getClaimRequirements(
          userId,
          classification.claimType,
        );
      case "start_claim":
        return this.claimService.prepareClaim(userId);
      case "redirect_to_human":
        return this.redirectToHumanResponse();
      case "unknown":
        return this.unknownResponse();
    }
  }

  private redirectToHumanResponse(): RedirectToHumanResponseDTO {
    return {
      type: "text",
      intent: "redirect_to_human",
      content: "我無法回答您這項問題，請您尋求專人服務。",
      data: {},
    };
  }

  private unknownResponse(): UnknownIntentResponseDTO {
    return {
      type: "text",
      intent: "unknown",
      content:
        "我可以協助您查詢保單、準備理賠文件，或開始理賠申請。請告訴我您想辦理的事項。",
      data: {},
    };
  }
}
