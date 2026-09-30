import { generateText, Output, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const intentSchema = z.object({
  intent: z.enum(["list_user_policies", "claim_required_documents", "start_claim", "unknown"]),
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
- claim_required_documents：詢問理賠需要哪些文件；同時判斷 claimType
- start_claim：想要開始、申請或進入理賠流程
- unknown：無法對應以上意圖
claimType 只可使用 hospitalization（住院）、accident（意外）、surgery（手術）；不涉及理賠文件時回傳 null。
若無法確定，請使用 unknown，不要猜測。`;

export class VercelIntentClassifier implements IntentClassifier {
  private readonly model: LanguageModel;

  public constructor(model: LanguageModel = openai(env.AI_MODEL)) {
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
        throw new AppError("AI 無法產生有效的意圖分類結果", 502, "AI_CLASSIFICATION_FAILED");
      }
      return output;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("AI 意圖判斷服務暫時無法使用", 502, "AI_CLASSIFICATION_FAILED");
    }
  }
}
