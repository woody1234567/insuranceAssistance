import {
  ALL_INTENTS,
  type CaseEvaluationResult,
  type ConfusionMatrix,
  type EvaluationSummary,
  type IntentMetric,
  type StabilityMetric,
  type TargetIntent,
} from "./types.js";

export function computeConfusionMatrix(
  results: CaseEvaluationResult[],
  labels: TargetIntent[] = ALL_INTENTS,
): ConfusionMatrix {
  const matrix: Record<TargetIntent, Record<TargetIntent, number>> = {} as any;

  for (const actual of labels) {
    matrix[actual] = {} as Record<TargetIntent, number>;
    for (const pred of labels) {
      matrix[actual][pred] = 0;
    }
  }

  for (const r of results) {
    const actual = r.testCase.expectedIntent;
    const predicted = r.prediction?.intent;
    if (predicted && labels.includes(predicted)) {
      matrix[actual][predicted] = (matrix[actual][predicted] || 0) + 1;
    }
  }

  return { labels, matrix };
}

export function computeIntentMetrics(
  results: CaseEvaluationResult[],
  labels: TargetIntent[] = ALL_INTENTS,
): {
  perIntent: Record<TargetIntent, IntentMetric>;
  macro: { precision: number; recall: number; f1: number };
  weighted: { precision: number; recall: number; f1: number };
} {
  const perIntent: Record<TargetIntent, IntentMetric> = {} as any;

  for (const label of labels) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;

    for (const r of results) {
      const actual = r.testCase.expectedIntent;
      const predicted = r.prediction?.intent ?? null;

      const isActual = actual === label;
      const isPredicted = predicted === label;

      if (isActual && isPredicted) tp++;
      else if (!isActual && isPredicted) fp++;
      else if (isActual && !isPredicted) fn++;
      else tn++;
    }

    const totalActual = tp + fn;
    const totalPredicted = tp + fp;
    const precision = totalPredicted > 0 ? tp / totalPredicted : 0;
    const recall = totalActual > 0 ? tp / totalActual : 0;
    const f1 =
      precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perIntent[label] = {
      intent: label,
      tp,
      fp,
      fn,
      tn,
      totalActual,
      totalPredicted,
      precision,
      recall,
      f1,
    };
  }

  // Macro average (arithmetic mean across classes with support or predictions)
  const activeLabels = labels.filter(
    (l) => perIntent[l].totalActual > 0 || perIntent[l].totalPredicted > 0,
  );
  const count = activeLabels.length || 1;
  const macroPrecision =
    activeLabels.reduce((acc, l) => acc + perIntent[l].precision, 0) / count;
  const macroRecall =
    activeLabels.reduce((acc, l) => acc + perIntent[l].recall, 0) / count;
  const macroF1 =
    activeLabels.reduce((acc, l) => acc + perIntent[l].f1, 0) / count;

  // Weighted average (weighted by class support)
  const totalSupport = results.length;
  const weightedPrecision =
    totalSupport > 0
      ? labels.reduce((acc, l) => acc + perIntent[l].precision * perIntent[l].totalActual, 0) /
        totalSupport
      : 0;
  const weightedRecall =
    totalSupport > 0
      ? labels.reduce((acc, l) => acc + perIntent[l].recall * perIntent[l].totalActual, 0) /
        totalSupport
      : 0;
  const weightedF1 =
    totalSupport > 0
      ? labels.reduce((acc, l) => acc + perIntent[l].f1 * perIntent[l].totalActual, 0) /
        totalSupport
      : 0;

  return {
    perIntent,
    macro: { precision: macroPrecision, recall: macroRecall, f1: macroF1 },
    weighted: { precision: weightedPrecision, recall: weightedRecall, f1: weightedF1 },
  };
}

export function computeStability(
  results: CaseEvaluationResult[],
): StabilityMetric {
  const caseMap = new Map<string, { expected: TargetIntent; text: string; predictions: TargetIntent[] }>();

  for (const r of results) {
    const id = r.testCase.id;
    if (!caseMap.has(id)) {
      caseMap.set(id, {
        expected: r.testCase.expectedIntent,
        text: r.testCase.text,
        predictions: [],
      });
    }
    if (r.prediction?.intent) {
      caseMap.get(id)!.predictions.push(r.prediction.intent);
    }
  }

  const caseConsistency: StabilityMetric["caseConsistency"] = [];
  let consistentCount = 0;

  for (const [id, data] of caseMap.entries()) {
    const uniquePreds = new Set(data.predictions);
    const isFullyConsistent = data.predictions.length > 0 && uniquePreds.size === 1;
    if (isFullyConsistent) consistentCount++;

    caseConsistency.push({
      id,
      text: data.text,
      expected: data.expected,
      predictions: data.predictions,
      isFullyConsistent,
    });
  }

  const totalCases = caseMap.size;
  const consistencyRate = totalCases > 0 ? consistentCount / totalCases : 1;

  return {
    totalCases,
    consistentCases: consistentCount,
    consistencyRate,
    caseConsistency,
  };
}

export function summarizeEvaluation(
  results: CaseEvaluationResult[],
  modelName: string,
  totalCases: number,
  stability?: StabilityMetric,
): EvaluationSummary {
  const confusionMatrix = computeConfusionMatrix(results);
  const { perIntent, macro, weighted } = computeIntentMetrics(results);

  let correctCount = 0;
  let failedCalls = 0;
  let totalLatency = 0;

  let totalDocsCases = 0;
  let correctDocsCases = 0;

  const badCases: EvaluationSummary["badCases"] = [];

  for (const r of results) {
    totalLatency += r.latencyMs;

    if (!r.prediction) {
      failedCalls++;
      badCases.push({
        id: r.testCase.id,
        text: r.testCase.text,
        expectedIntent: r.testCase.expectedIntent,
        predictedIntent: "ERROR",
        expectedClaimType: r.testCase.expectedClaimType,
        predictedClaimType: "ERROR",
        category: r.testCase.category,
        error: r.error,
      });
      continue;
    }

    if (r.isCorrectIntent) {
      correctCount++;
    } else {
      badCases.push({
        id: r.testCase.id,
        text: r.testCase.text,
        expectedIntent: r.testCase.expectedIntent,
        predictedIntent: r.prediction.intent,
        expectedClaimType: r.testCase.expectedClaimType,
        predictedClaimType: r.prediction.claimType,
        confidence: r.prediction.confidence,
        category: r.testCase.category,
      });
    }

    if (r.testCase.expectedIntent === "claim_required_documents") {
      totalDocsCases++;
      if (r.isCorrectClaimType) {
        correctDocsCases++;
      }
    }
  }

  const overallAccuracy = results.length > 0 ? correctCount / results.length : 0;
  const docsAccuracy =
    totalDocsCases > 0 ? correctDocsCases / totalDocsCases : 0;
  const averageLatencyMs =
    results.length > 0 ? Math.round(totalLatency / results.length) : 0;

  return {
    timestamp: new Date().toISOString(),
    model: modelName,
    totalCases,
    totalEvaluated: results.length,
    failedCalls,
    overallAccuracy,
    claimTypeAccuracy: {
      totalDocsCases,
      correctDocsCases,
      accuracy: docsAccuracy,
    },
    macroMetrics: macro,
    weightedMetrics: weighted,
    intentMetrics: perIntent,
    confusionMatrix,
    badCases,
    stability,
    averageLatencyMs,
  };
}

export function formatConfusionMatrixTable(matrix: ConfusionMatrix): string {
  const shortNames: Record<TargetIntent, string> = {
    list_user_policies: "POLICIES",
    claim_required_documents: "DOCUMENTS",
    start_claim: "START_CLM",
    redirect_to_human: "HUMAN",
    unknown: "UNKNOWN",
  };

  const colWidth = 11;
  const header =
    "Actual \\ Pred".padEnd(16) +
    matrix.labels.map((l) => shortNames[l].padStart(colWidth)).join(" ");

  const separator = "-".repeat(header.length);

  const rows = matrix.labels.map((actual) => {
    const rowLabel = shortNames[actual].padEnd(16);
    const cells = matrix.labels
      .map((pred) => String(matrix.matrix[actual][pred] || 0).padStart(colWidth))
      .join(" ");
    return `${rowLabel}${cells}`;
  });

  return [header, separator, ...rows].join("\n");
}

export function formatMetricsTable(summary: EvaluationSummary): string {
  const shortNames: Record<TargetIntent, string> = {
    list_user_policies: "list_user_policies",
    claim_required_documents: "claim_required_documents",
    start_claim: "start_claim",
    redirect_to_human: "redirect_to_human",
    unknown: "unknown",
  };

  const pad = (s: string | number, len: number) => String(s).padEnd(len);
  const pct = (n: number) => (n * 100).toFixed(1) + "%";

  const lines = [
    `Intent Classification Metrics Report (Model: ${summary.model})`,
    "=".repeat(75),
    `${pad("Intent", 28)} ${pad("Support", 10)} ${pad("Precision", 12)} ${pad("Recall", 10)} ${pad("F1-Score", 10)}`,
    "-".repeat(75),
  ];

  for (const label of ALL_INTENTS) {
    const m = summary.intentMetrics[label];
    lines.push(
      `${pad(shortNames[label], 28)} ${pad(m.totalActual, 10)} ${pad(pct(m.precision), 12)} ${pad(pct(m.recall), 10)} ${pad(pct(m.f1), 10)}`,
    );
  }

  lines.push("-".repeat(75));
  lines.push(
    `${pad("Macro Average", 28)} ${pad(summary.totalEvaluated, 10)} ${pad(pct(summary.macroMetrics.precision), 12)} ${pad(pct(summary.macroMetrics.recall), 10)} ${pad(pct(summary.macroMetrics.f1), 10)}`,
  );
  lines.push(
    `${pad("Weighted Average", 28)} ${pad(summary.totalEvaluated, 10)} ${pad(pct(summary.weightedMetrics.precision), 12)} ${pad(pct(summary.weightedMetrics.recall), 10)} ${pad(pct(summary.weightedMetrics.f1), 10)}`,
  );
  lines.push("=".repeat(75));
  lines.push(
    `Overall Accuracy: ${pct(summary.overallAccuracy)} (${summary.totalEvaluated - summary.badCases.length}/${summary.totalEvaluated})`,
  );
  lines.push(
    `Claim Type Accuracy (Hospital/Accident/Surg): ${pct(summary.claimTypeAccuracy.accuracy)} (${summary.claimTypeAccuracy.correctDocsCases}/${summary.claimTypeAccuracy.totalDocsCases})`,
  );
  lines.push(`Average Latency: ${summary.averageLatencyMs}ms`);

  if (summary.stability) {
    lines.push(
      `Multi-run Stability Consistency Rate: ${pct(summary.stability.consistencyRate)} (${summary.stability.consistentCases}/${summary.stability.totalCases})`,
    );
  }

  return lines.join("\n");
}

export function exportConfusionMatrixCsv(matrix: ConfusionMatrix): string {
  const header = ["Actual \\ Predicted", ...matrix.labels].join(",");
  const rows = matrix.labels.map((actual) => {
    const row = [actual, ...matrix.labels.map((pred) => matrix.matrix[actual][pred] || 0)];
    return row.join(",");
  });
  return [header, ...rows].join("\n");
}
