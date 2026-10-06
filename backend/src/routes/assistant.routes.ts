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

/**
 * @openapi
 * /api/v1/assistant/message:
 *   post:
 *     tags:
 *       - Assistant
 *     summary: 發送諮詢訊息給 AI 助理
 *     description: 透過 AI 意圖識別分析使用者輸入，並依據意圖查詢保單、理賠文件、發起理賠或回覆未知意圖。
 *     security:
 *       - bearerAuth: []
 *       - userIdHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssistantMessageRequest'
 *     responses:
 *       200:
 *         description: 成功取得 AI 助理回應
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/PolicyResponseDTO'
 *                     - $ref: '#/components/schemas/ClaimRequirementsResponseDTO'
 *                     - $ref: '#/components/schemas/StartClaimResponseDTO'
 *                     - $ref: '#/components/schemas/UnknownIntentResponseDTO'
 *                     - $ref: '#/components/schemas/RedirectToHumanResponseDTO'
 *                 meta:
 *                   $ref: '#/components/schemas/ApiSuccessMeta'
 *       400:
 *         description: 請求參數錯誤（如訊息為空）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: 尚未登入或認證無效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: 系統內部錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.post("/assistant/message", requireAuth, assistantController.postMessage);

export { router as assistantRouter };
