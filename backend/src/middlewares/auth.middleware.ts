import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const headerUserId = req.headers["x-user-id"];

    let userId: string | undefined;
    if (typeof headerUserId === "string" && headerUserId.trim().length > 0) {
      userId = headerUserId.trim();
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      userId = authHeader.slice(7).trim();
    }

    if (!userId) {
      throw new AppError("尚未登入或認證無效", 401, "UNAUTHORIZED");
    }

    req.user = { id: userId };
    next();
  } catch (error) {
    next(error);
  }
}
