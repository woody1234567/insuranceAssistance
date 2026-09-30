import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ClaimService } from "../services/claim.service.js";
import { ApiResponse } from "../utils/api-response.js";
import { AppError } from "../utils/app-error.js";

const claimQuerySchema = z.object({ type: z.string().trim().min(1) });

export class ClaimController {
  private readonly claimService: ClaimService;

  public constructor(claimService: ClaimService) {
    this.claimService = claimService;
  }

  public getRequirements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = this.requireUserId(req);
      const { type } = claimQuerySchema.parse(req.query);
      res.status(200).json(ApiResponse.success(await this.claimService.getClaimRequirements(userId, type), req.id));
    } catch (error) {
      next(error);
    }
  };

  public startClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(ApiResponse.success(await this.claimService.prepareClaim(this.requireUserId(req)), req.id));
    } catch (error) {
      next(error);
    }
  };

  private requireUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("尚未登入或認證無效", 401, "UNAUTHORIZED");
    }
    return userId;
  }
}
