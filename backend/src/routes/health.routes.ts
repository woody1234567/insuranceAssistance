import { Router } from "express";
import { checkDatabaseConnection } from "../db/index.js";

const router = Router();

/**
 * @openapi
 * /healthz:
 *   get:
 *     tags:
 *       - System
 *     summary: 系統與資料庫健康檢查
 *     description: 檢查後端應用程式及資料庫連線狀態。
 *     responses:
 *       200:
 *         description: 系統運行正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/HealthCheckData'
 *                 meta:
 *                   $ref: '#/components/schemas/ApiSuccessMeta'
 *       500:
 *         description: 資料庫連線異常或系統故障
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get("/", async (_req, res, next) => {
  try {
    await checkDatabaseConnection();
    res.status(200).json({
      success: true,
      data: { status: "ok", database: "ok" },
      meta: { timestamp: Date.now() },
    });
  } catch (error) {
    next(error);
  }
});

export { router as healthRouter };
