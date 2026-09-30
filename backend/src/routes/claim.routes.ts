import { Router } from "express";
import { ClaimController } from "../controllers/claim.controller.js";
import { db } from "../db/index.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { ClaimRequirementRepository } from "../repositories/claim-requirement.repository.js";
import { UserInsuranceRepository } from "../repositories/user-insurance.repository.js";
import { ClaimService } from "../services/claim.service.js";

const policyRepository = new UserInsuranceRepository(db);
const claimRepository = new ClaimRequirementRepository(db);
const claimController = new ClaimController(new ClaimService(policyRepository, claimRepository));
const router = Router();

router.get("/claims/requirements", requireAuth, claimController.getRequirements);
router.post("/claims/start", requireAuth, claimController.startClaim);

export { router as claimRouter };
