import { describe, expect, it } from "vitest";
import {
  computeConfusionMatrix,
  computeIntentMetrics,
  computeStability,
  formatConfusionMatrixTable,
  formatMetricsTable,
  summarizeEvaluation,
} from "../../evaluation/metrics.js";
import type { CaseEvaluationResult } from "../../evaluation/types.js";

describe("Evaluation Metrics", () => {
  const sampleResults: CaseEvaluationResult[] = [
    {
      testCase: {
        id: "T1",
        text: "查保單",
        expectedIntent: "list_user_policies",
        expectedClaimType: null,
        category: "standard",
      },
      prediction: {
        intent: "list_user_policies",
        claimType: null,
        confidence: 0.99,
      },
      isCorrectIntent: true,
      isCorrectClaimType: true,
      latencyMs: 150,
    },
    {
      testCase: {
        id: "T2",
        text: "我有幾張保單",
        expectedIntent: "list_user_policies",
        expectedClaimType: null,
        category: "colloquial",
      },
      prediction: {
        intent: "list_user_policies",
        claimType: null,
        confidence: 0.95,
      },
      isCorrectIntent: true,
      isCorrectClaimType: true,
      latencyMs: 120,
    },
    {
      testCase: {
        id: "T3",
        text: "車禍住院要帶什麼",
        expectedIntent: "claim_required_documents",
        expectedClaimType: "accident",
        category: "standard",
      },
      prediction: {
        intent: "claim_required_documents",
        claimType: "accident",
        confidence: 0.9,
      },
      isCorrectIntent: true,
      isCorrectClaimType: true,
      latencyMs: 130,
    },
    {
      testCase: {
        id: "T4",
        text: "我要辦理賠",
        expectedIntent: "start_claim",
        expectedClaimType: null,
        category: "colloquial",
      },
      prediction: {
        intent: "claim_required_documents", // Misclassified as claim_required_documents
        claimType: null,
        confidence: 0.8,
      },
      isCorrectIntent: false,
      isCorrectClaimType: true,
      latencyMs: 140,
    },
  ];

  it("computes confusion matrix correctly", () => {
    const cm = computeConfusionMatrix(sampleResults);

    expect(cm.matrix.list_user_policies.list_user_policies).toBe(2);
    expect(cm.matrix.claim_required_documents.claim_required_documents).toBe(1);
    expect(cm.matrix.start_claim.claim_required_documents).toBe(1);
    expect(cm.matrix.start_claim.start_claim).toBe(0);
  });

  it("computes precision, recall and F1 correctly", () => {
    const { perIntent } = computeIntentMetrics(sampleResults);

    // list_user_policies: TP = 2, FP = 0, FN = 0 -> Precision = 1, Recall = 1, F1 = 1
    expect(perIntent.list_user_policies.precision).toBe(1);
    expect(perIntent.list_user_policies.recall).toBe(1);
    expect(perIntent.list_user_policies.f1).toBe(1);

    // claim_required_documents: TP = 1 (T3), FP = 1 (T4 predicted as documents), FN = 0
    // Precision = 1 / 2 = 0.5, Recall = 1 / 1 = 1.0, F1 = 2 * 0.5 * 1 / 1.5 = 0.6667
    expect(perIntent.claim_required_documents.precision).toBe(0.5);
    expect(perIntent.claim_required_documents.recall).toBe(1);
    expect(perIntent.claim_required_documents.f1).toBeCloseTo(0.6667, 3);

    // start_claim: TP = 0, FP = 0, FN = 1 -> Precision = 0, Recall = 0, F1 = 0
    expect(perIntent.start_claim.precision).toBe(0);
    expect(perIntent.start_claim.recall).toBe(0);
    expect(perIntent.start_claim.f1).toBe(0);
  });

  it("computes multi-run stability metric", () => {
    const stabilityCases: CaseEvaluationResult[] = [
      {
        testCase: {
          id: "T1",
          text: "我要辦理賠",
          expectedIntent: "start_claim",
          expectedClaimType: null,
          category: "standard",
        },
        prediction: { intent: "start_claim", claimType: null, confidence: 0.9 },
        isCorrectIntent: true,
        isCorrectClaimType: true,
        latencyMs: 100,
        runIndex: 1,
      },
      {
        testCase: {
          id: "T1",
          text: "我要辦理賠",
          expectedIntent: "start_claim",
          expectedClaimType: null,
          category: "standard",
        },
        prediction: { intent: "start_claim", claimType: null, confidence: 0.95 },
        isCorrectIntent: true,
        isCorrectClaimType: true,
        latencyMs: 100,
        runIndex: 2,
      },
      {
        testCase: {
          id: "T2",
          text: "模糊問題",
          expectedIntent: "unknown",
          expectedClaimType: null,
          category: "standard",
        },
        prediction: { intent: "unknown", claimType: null, confidence: 0.8 },
        isCorrectIntent: true,
        isCorrectClaimType: true,
        latencyMs: 100,
        runIndex: 1,
      },
      {
        testCase: {
          id: "T2",
          text: "模糊問題",
          expectedIntent: "unknown",
          expectedClaimType: null,
          category: "standard",
        },
        prediction: { intent: "redirect_to_human", claimType: null, confidence: 0.7 },
        isCorrectIntent: false,
        isCorrectClaimType: true,
        latencyMs: 100,
        runIndex: 2,
      },
    ];

    const stability = computeStability(stabilityCases);
    expect(stability.totalCases).toBe(2);
    expect(stability.consistentCases).toBe(1);
    expect(stability.consistencyRate).toBe(0.5);
  });

  it("formats confusion matrix and metrics summary correctly", () => {
    const summary = summarizeEvaluation(sampleResults, "gemini-test", 4);
    expect(summary.overallAccuracy).toBe(0.75);
    expect(summary.badCases.length).toBe(1);

    const cmTable = formatConfusionMatrixTable(summary.confusionMatrix);
    expect(cmTable).toContain("Actual \\ Pred");
    expect(cmTable).toContain("POLICIES");

    const metricsTable = formatMetricsTable(summary);
    expect(metricsTable).toContain("Overall Accuracy: 75.0%");
  });
});
