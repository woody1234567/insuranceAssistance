import { Router } from "express";
import { checkDatabaseConnection } from "../db/index.js";

const router = Router();

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
