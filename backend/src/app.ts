import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import { parsedCorsOrigins } from "./config/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/logging.middleware.js";
import { apiRouter } from "./routes/index.js";
import { healthRouter } from "./routes/health.routes.js";
import { swaggerRouter } from "./routes/swagger.routes.js";

/**
 * @openapi
 * /:
 *   get:
 *     tags:
 *       - System
 *     summary: 應用程式根路徑檢查
 *     description: 回傳後端服務基礎資訊
 *     responses:
 *       200:
 *         description: 成功取得服務資訊
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: insurance-assistance-backend
 */
export function createApp(): Express {
  const app = express();

  // GCP Cloud Run / Load Balancer reverse proxy support
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin:
        parsedCorsOrigins.length === 0
          ? true
          : (origin, callback) => {
              if (!origin || parsedCorsOrigins.includes(origin)) {
                callback(null, true);
              } else {
                callback(new Error(`CORS blocked for origin: ${origin}`));
              }
            },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.use(swaggerRouter);

  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { name: "insurance-assistance-backend" } });
  });
  app.use("/healthz", healthRouter);
  app.use("/api/v1", apiRouter);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: `路徑 ${req.originalUrl} 不存在` },
      meta: { timestamp: Date.now(), ...(req.id ? { requestId: req.id } : {}) },
    });
  });
  app.use(errorHandler);
  return app;
}

const app = createApp();
export default app;
