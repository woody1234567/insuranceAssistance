import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next): void => {
  const appError = error instanceof AppError ? error : undefined;
  const details = error instanceof ZodError
    ? error.issues.map((issue) => ({ field: issue.path.join("."), issue: issue.message }))
    : appError?.details;
  const statusCode = error instanceof ZodError ? 400 : appError?.statusCode ?? 500;
  const errorCode = error instanceof ZodError ? "VALIDATION_FAILED" : appError?.errorCode ?? "INTERNAL_SERVER_ERROR";
  const message = error instanceof ZodError ? "請求參數驗證失敗" : appError?.message ?? "伺服器內部錯誤，請稍後再試";

  logger.error("Request failed", {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    errorCode,
    error: error instanceof Error ? error.message : String(error),
    stack: process.env.NODE_ENV === "production" ? undefined : error instanceof Error ? error.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details === undefined ? {} : { details }),
    },
    meta: {
      timestamp: Date.now(),
      ...(req.id ? { requestId: req.id } : {}),
    },
  });
};
