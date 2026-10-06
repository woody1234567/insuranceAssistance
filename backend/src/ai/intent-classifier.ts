import { generateText, Output, type LanguageModel } from "ai";
import { createAIModel } from "./model-provider.js";
import { z } from "zod";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

export const intentSchema = z.object({
  intent: z.enum([
    "list_user_policies",
    "claim_required_documents",
    "start_claim",
    "redirect_to_human",
    "unknown",
  ]),
  claimType: z.enum(["hospitalization", "accident", "surgery"]).nullable(),
  confidence: z.number().min(0).max(1),
});

export type IntentClassification = z.infer<typeof intentSchema>;

export interface IntentClassifier {
  classify(message: string): Promise<IntentClassification>;
}

import {
  SYSTEM_PROMPT_V1,
  SYSTEM_PROMPT_V2,
} from "./prompts/intent-prompts.js";

export const DEFAULT_INTENT_SYSTEM_PROMPT = SYSTEM_PROMPT_V2;
export { SYSTEM_PROMPT_V1, SYSTEM_PROMPT_V2 };

export class VercelIntentClassifier implements IntentClassifier {
  private readonly model: LanguageModel;
  private readonly systemPrompt: string;

  public constructor(
    model: LanguageModel = createAIModel(),
    systemPromptOverride?: string,
  ) {
    this.model = model;
    this.systemPrompt = systemPromptOverride ?? DEFAULT_INTENT_SYSTEM_PROMPT;
  }

  public async classify(message: string): Promise<IntentClassification> {
    try {
      const { output } = await generateText({
        model: this.model,
        system: this.systemPrompt,
        prompt: message,
        output: Output.object({
          schema: intentSchema,
          name: "insurance_intent",
          description: "保險智慧助理的意圖與理賠類型分類結果",
        }),
      });
      if (!output) {
        throw new AppError(
          "AI 無法產生有效的意圖分類結果",
          502,
          "AI_CLASSIFICATION_FAILED",
        );
      }
      return output;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const rawErrorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("AI intent classification failed", {
        error: rawErrorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new AppError(
        "AI 意圖判斷服務暫時無法使用",
        502,
        "AI_CLASSIFICATION_FAILED",
      );
    }
  }
}
