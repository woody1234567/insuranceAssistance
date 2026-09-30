import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { AssistantService } from "../services/assistant.service.js";
import { ApiResponse } from "../utils/api-response.js";
import { AppError } from "../utils/app-error.js";

const messageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export class AssistantController {
  private readonly assistantService: AssistantService;

  public constructor(assistantService: AssistantService) {
    this.assistantService = assistantService;
  }

  public postMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError("尚未登入或認證無效", 401, "UNAUTHORIZED");
      }
      const { message } = messageSchema.parse(req.body);
      const result = await this.assistantService.handleMessage(userId, message);
      res.status(200).json(ApiResponse.success(result, req.id));
    } catch (error) {
      next(error);
    }
  };
}
