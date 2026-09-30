import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/logging.middleware.js";
import { apiRouter } from "./routes/index.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(): Express {
  const app = express();

  // Better Auth must receive the raw request before body parsers consume it.
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
    credentials: true,
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

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
