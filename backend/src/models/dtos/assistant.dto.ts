import type { ClaimRequirementsResponseDTO, StartClaimResponseDTO } from "./claim.dto.js";
import type { PolicyResponseDTO } from "./policy.dto.js";

export type UnknownIntentResponseDTO = {
  type: "text";
  intent: "unknown";
  content: string;
  data: Record<string, never>;
};

export type AssistantResponseDTO =
  | PolicyResponseDTO
  | ClaimRequirementsResponseDTO
  | StartClaimResponseDTO
  | UnknownIntentResponseDTO;
