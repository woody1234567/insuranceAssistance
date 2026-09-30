import type { NextFunction, Request, Response } from "express";
import { UserPolicyService } from "../services/user-policy.service.js";
import { ApiResponse } from "../utils/api-response.js";
import { AppError } from "../utils/app-error.js";

export class PolicyController {
  private readonly policyService: UserPolicyService;

  public constructor(policyService: UserPolicyService) {
    this.policyService = policyService;
  }

  public getPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError("尚未登入或認證無效", 401, "UNAUTHORIZED");
      }
      res.status(200).json(ApiResponse.success(await this.policyService.getUserPolicies(userId), req.id));
    } catch (error) {
      next(error);
    }
  };
}
