import { Router } from "express";
import { PolicyController } from "../controllers/policy.controller.js";
import { db } from "../db/index.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { UserInsuranceRepository } from "../repositories/user-insurance.repository.js";
import { UserPolicyService } from "../services/user-policy.service.js";

const policyRepository = new UserInsuranceRepository(db);
const policyController = new PolicyController(new UserPolicyService(policyRepository));
const router = Router();

/**
 * @openapi
 * /api/v1/policies:
 *   get:
 *     tags:
 *       - Policies
 *     summary: 查詢使用者所有有效保單
 *     description: 取得當前已登入使用者名下的所有有效保單列表與總數。
 *     security:
 *       - bearerAuth: []
 *       - userIdHeader: []
 *     responses:
 *       200:
 *         description: 成功取得保單清單
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PolicyData'
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
 * /api/v1/users/me/policies:
 *   get:
 *     tags:
 *       - Policies
 *     summary: 查詢當前使用者的個人保單
 *     description: 與 /api/v1/policies 相同，提供符合 RESTful 設計規範的使用者個人保單查詢端點。
 *     security:
 *       - bearerAuth: []
 *       - userIdHeader: []
 *     responses:
 *       200:
 *         description: 成功取得保單清單
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PolicyData'
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
router.get("/policies", requireAuth, policyController.getPolicies);
router.get("/users/me/policies", requireAuth, policyController.getPolicies);

export { router as policyRouter };
