import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { AppError } from "../utils/app-error.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      throw new AppError("尚未登入或認證無效", 401, "UNAUTHORIZED");
    }
    req.user = { id: session.user.id };
    next();
  } catch (error) {
    next(error);
  }
}
