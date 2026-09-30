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

/**
 * @openapi
 * /api/v1/claims/requirements:
 *   get:
 *     tags:
 *       - Claims
 *     summary: 查詢理賠所需文件與注意事項
 *     description: 依據理賠類型（例如：住院、意外、門診）查詢使用者持有保單對應所需檢附的證明文件與注意事項。
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: 理賠類型（如「住院」、「意外」）
 *         example: "住院"
 *     responses:
 *       200:
 *         description: 成功取得理賠所需文件清單
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ClaimRequirementsData'
 *                 meta:
 *                   $ref: '#/components/schemas/ApiSuccessMeta'
 *       400:
 *         description: 缺少必填參數或格式錯誤
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
router.get("/claims/requirements", requireAuth, claimController.getRequirements);

/**
 * @openapi
 * /api/v1/claims/start:
 *   post:
 *     tags:
 *       - Claims
 *     summary: 發起理賠申請導引
 *     description: 查詢使用者當前有效保單，並回傳導引至前端理賠申請頁面的操作指令與可理賠保單清單。
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功產生理賠申請導引 Action
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StartClaimResponseDTO'
 *                 meta:
 *                   $ref: '#/components/schemas/ApiSuccessMeta'
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
router.post("/claims/start", requireAuth, claimController.startClaim);

export { router as claimRouter };
