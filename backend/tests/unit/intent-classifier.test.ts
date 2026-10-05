import { describe, expect, it, vi, beforeEach } from "vitest";
import { VercelIntentClassifier } from "../../src/ai/intent-classifier.js";
import { createAIModel } from "../../src/ai/model-provider.js";
import * as aiModule from "ai";
import { AppError } from "../../src/utils/app-error.js";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

describe("AI Model Provider & Intent Classifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAIModel", () => {
    it("creates a Google Vertex AI model by default", () => {
      const model = createAIModel("gemini-2.0-flash");
      expect(model).toBeDefined();
      expect(model.modelId).toBe("gemini-2.0-flash");
      expect(model.provider).toContain("google.vertex");
    });
  });

  describe("VercelIntentClassifier", () => {
    it("successfully classifies message into structured intent", async () => {
      const mockOutput = {
        intent: "claim_required_documents" as const,
        claimType: "hospitalization" as const,
        confidence: 0.98,
      };

      vi.mocked(aiModule.generateText).mockResolvedValueOnce({
        output: mockOutput,
      } as any);

      const classifier = new VercelIntentClassifier();
      const result = await classifier.classify("住院理賠需要什麼文件？");

      expect(result).toEqual(mockOutput);
      expect(aiModule.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "住院理賠需要什麼文件？",
        }),
      );
    });

    it("successfully classifies unmatchable message into redirect_to_human intent", async () => {
      const mockOutput = {
        intent: "redirect_to_human" as const,
        claimType: null,
        confidence: 0.95,
      };

      vi.mocked(aiModule.generateText).mockResolvedValueOnce({
        output: mockOutput,
      } as any);

      const classifier = new VercelIntentClassifier();
      const result = await classifier.classify("我想了解房貸利率");

      expect(result).toEqual(mockOutput);
    });

    it("throws AppError with AI_CLASSIFICATION_FAILED when output is missing", async () => {
      vi.mocked(aiModule.generateText).mockResolvedValueOnce({
        output: null,
      } as any);

      const classifier = new VercelIntentClassifier();

      await expect(classifier.classify("隨便說說")).rejects.toThrow(
        new AppError("AI 無法產生有效的意圖分類結果", 502, "AI_CLASSIFICATION_FAILED"),
      );
    });

    it("throws AppError with 502 on upstream generation error", async () => {
      vi.mocked(aiModule.generateText).mockRejectedValueOnce(new Error("Vertex AI quota exceeded"));

      const classifier = new VercelIntentClassifier();

      await expect(classifier.classify("隨便說說")).rejects.toThrow(
        new AppError("AI 意圖判斷服務暫時無法使用", 502, "AI_CLASSIFICATION_FAILED"),
      );
    });
  });
});
