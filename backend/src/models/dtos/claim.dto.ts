import type { ClaimDocument } from "../../db/schema/claim-requirements.js";

export type ClaimRequirementsResponseDTO = {
  type: "text";
  intent: "claim_required_documents";
  content: string;
  data: {
    claimType: string;
    requiredDocuments: ClaimDocument[];
    notes: string[];
  };
};

export type StartClaimResponseDTO = {
  type: "action";
  intent: "start_claim";
  action: "NAVIGATE";
  payload: {
    route: "/claims/apply";
    params: {
      availablePolicyIds: string[];
    };
  };
  message: string;
};
