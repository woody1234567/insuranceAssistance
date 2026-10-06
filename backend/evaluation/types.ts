import type { IntentClassification } from "../src/ai/intent-classifier.js";

export type TargetIntent = IntentClassification["intent"];
export type TargetClaimType = IntentClassification["claimType"];

export const ALL_INTENTS: TargetIntent[] = [
  "list_user_policies",
  "claim_required_documents",
  "start_claim",
  "redirect_to_human",
  "unknown",
];

export interface EvaluationTestCase {
  id: string;
  text: string;
  expectedIntent: TargetIntent;
  expectedClaimType: TargetClaimType;
  category:
    | "standard"
    | "colloquial"
    | "short"
    | "typo"
    | "ambiguous"
    | "out_of_domain"
    | "chitchat"
    | "unsupported_service";
  notes?: string;
}

export interface CaseEvaluationResult {
  testCase: EvaluationTestCase;
  prediction: IntentClassification | null;
  isCorrectIntent: boolean;
  isCorrectClaimType: boolean;
  latencyMs: number;
  error?: string;
  runIndex?: number;
}

export interface IntentMetric {
  intent: TargetIntent;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  totalActual: number;
  totalPredicted: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ConfusionMatrix {
  labels: TargetIntent[];
  matrix: Record<TargetIntent, Record<TargetIntent, number>>;
}

export interface StabilityMetric {
  totalCases: number;
  consistentCases: number;
  consistencyRate: number;
  caseConsistency: Array<{
    id: string;
    text: string;
    expected: TargetIntent;
    predictions: TargetIntent[];
    isFullyConsistent: boolean;
  }>;
}

export interface EvaluationSummary {
  timestamp: string;
  model: string;
  totalCases: number;
  totalEvaluated: number;
  failedCalls: number;
  overallAccuracy: number;
  claimTypeAccuracy: {
    totalDocsCases: number;
    correctDocsCases: number;
    accuracy: number;
  };
  macroMetrics: {
    precision: number;
    recall: number;
    f1: number;
  };
  weightedMetrics: {
    precision: number;
    recall: number;
    f1: number;
  };
  intentMetrics: Record<TargetIntent, IntentMetric>;
  confusionMatrix: ConfusionMatrix;
  badCases: Array<{
    id: string;
    text: string;
    expectedIntent: TargetIntent;
    predictedIntent: TargetIntent | "ERROR";
    expectedClaimType: TargetClaimType;
    predictedClaimType: TargetClaimType | "ERROR";
    confidence?: number;
    category: string;
    error?: string;
  }>;
  stability?: StabilityMetric;
  averageLatencyMs: number;
}
