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

const systemPrompt = `你是保險智慧助理的意圖分類器。請只依照使用者訊息判斷意圖，不要回答問題。
可用意圖：
- list_user_policies：查詢自己目前有幾張保單、查看保單或保險
- claim_required_documents：詢問理賠需要哪些文件；同時判斷 claimType，claimType 只可使用 hospitalization（住院）、accident（意外）、surgery（手術）
- start_claim：想要開始、申請或進入理賠流程
- redirect_to_human：無法歸類為以上三種意圖（如詢問無關主題、一般問候、或無法確定）；不涉及理賠文件時回傳 null。
若非上述業務且問題複雜須轉介人類客服才能解決，請使用 redirect_to_human;
如果無法判斷使用者意圖，請使用 unknown。`;

export class VercelIntentClassifier implements IntentClassifier {
  private readonly model: LanguageModel;

  public constructor(model: LanguageModel = createAIModel()) {
    this.model = model;
  }

  public async classify(message: string): Promise<IntentClassification> {
    try {
      const { output } = await generateText({
        model: this.model,
        system: systemPrompt,
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
