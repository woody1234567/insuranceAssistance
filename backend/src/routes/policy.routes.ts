import { Router } from "express";
import { PolicyController } from "../controllers/policy.controller.js";
import { db } from "../db/index.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { UserInsuranceRepository } from "../repositories/user-insurance.repository.js";
import { UserPolicyService } from "../services/user-policy.service.js";

const policyRepository = new UserInsuranceRepository(db);
const policyController = new PolicyController(new UserPolicyService(policyRepository));
const router = Router();

router.get("/policies", requireAuth, policyController.getPolicies);
router.get("/users/me/policies", requireAuth, policyController.getPolicies);

export { router as policyRouter };
