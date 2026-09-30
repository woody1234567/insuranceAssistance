import { Router } from "express";
import { AssistantController } from "../controllers/assistant.controller.js";
import { VercelIntentClassifier } from "../ai/intent-classifier.js";
import { IntentRouter } from "../ai/intent-router.js";
import { db } from "../db/index.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { ClaimRequirementRepository } from "../repositories/claim-requirement.repository.js";
import { UserInsuranceRepository } from "../repositories/user-insurance.repository.js";
import { AssistantService } from "../services/assistant.service.js";
import { ClaimService } from "../services/claim.service.js";
import { UserPolicyService } from "../services/user-policy.service.js";

const policyRepository = new UserInsuranceRepository(db);
const claimService = new ClaimService(policyRepository, new ClaimRequirementRepository(db));
const policyService = new UserPolicyService(policyRepository);
const assistantService = new AssistantService(
  new VercelIntentClassifier(),
  new IntentRouter(policyService, claimService),
);
const assistantController = new AssistantController(assistantService);
const router = Router();

router.post("/assistant/message", requireAuth, assistantController.postMessage);

export { router as assistantRouter };
