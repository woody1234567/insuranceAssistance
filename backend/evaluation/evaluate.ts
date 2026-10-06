import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VercelIntentClassifier } from "../src/ai/intent-classifier.js";
import { env } from "../src/config/env.js";
import {
  computeStability,
  exportConfusionMatrixCsv,
  formatConfusionMatrixTable,
  formatMetricsTable,
  summarizeEvaluation,
} from "./metrics.js";
import type {
  CaseEvaluationResult,
  EvaluationSummary,
  EvaluationTestCase,
} from "./types.js";

import {
  SYSTEM_PROMPT_V1,
  SYSTEM_PROMPT_V2,
} from "../src/ai/prompts/intent-prompts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CliOptions {
  datasetPath: string;
  runs: number;
  concurrency: number;
  delayMs: number;
  limit?: number;
  exportResults: boolean;
  promptVersion: "v1" | "v2";
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    datasetPath: path.resolve(__dirname, "./datasets/intent-test-cases.json"),
    runs: 1,
    concurrency: 3,
    delayMs: 200,
    exportResults: true,
    promptVersion: "v2",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dataset" && args[i + 1]) {
      options.datasetPath = path.resolve(process.cwd(), args[++i]);
    } else if (arg === "--runs" && args[i + 1]) {
      options.runs = Math.max(1, parseInt(args[++i], 10) || 1);
    } else if (arg === "--concurrency" && args[i + 1]) {
      options.concurrency = Math.max(1, parseInt(args[++i], 10) || 1);
    } else if (arg === "--delay" && args[i + 1]) {
      options.delayMs = Math.max(0, parseInt(args[++i], 10) || 0);
    } else if (arg === "--limit" && args[i + 1]) {
      options.limit = Math.max(1, parseInt(args[++i], 10));
    } else if (arg === "--prompt" && args[i + 1]) {
      const p = args[++i].toLowerCase();
      options.promptVersion = p === "v1" ? "v1" : "v2";
    } else if (arg === "--no-export") {
      options.exportResults = false;
    }
  }

  return options;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function classifyWithRetry(
  classifier: VercelIntentClassifier,
  text: string,
  maxRetries = 2,
): Promise<{ output: any; latencyMs: number; error?: string }> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    const start = performance.now();
    try {
      const output = await classifier.classify(text);
      const latencyMs = Math.round(performance.now() - start);
      return { output, latencyMs };
    } catch (error: any) {
      attempt++;
      const latencyMs = Math.round(performance.now() - start);
      const errorMsg = error instanceof Error ? error.message : String(error);

      const isRateLimit =
        errorMsg.includes("429") ||
        errorMsg.toLowerCase().includes("quota") ||
        errorMsg.toLowerCase().includes("resource exhausted");

      if (attempt <= maxRetries) {
        const waitTime = isRateLimit ? 3500 * attempt : 1000 * attempt;
        console.warn(
          `  ⚠️ [Retry ${attempt}/${maxRetries}] for "${text.slice(0, 15)}...": ${errorMsg}. Waiting ${waitTime}ms...`,
        );
        await sleep(waitTime);
      } else {
        return { output: null, latencyMs, error: errorMsg };
      }
    }
  }
  return { output: null, latencyMs: 0, error: "Exceeded max retries" };
}

async function runEvaluationPool(
  cases: EvaluationTestCase[],
  classifier: VercelIntentClassifier,
  runs: number,
  concurrency: number,
  delayMs: number,
): Promise<CaseEvaluationResult[]> {
  const tasks: Array<{ testCase: EvaluationTestCase; runIndex: number }> = [];

  for (let r = 1; r <= runs; r++) {
    for (const c of cases) {
      tasks.push({ testCase: c, runIndex: r });
    }
  }

  const results: CaseEvaluationResult[] = [];
  let completedCount = 0;
  const totalTasks = tasks.length;

  let currentIndex = 0;

  async function worker(workerId: number): Promise<void> {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      const { testCase, runIndex } = tasks[index];

      const { output, latencyMs, error } = await classifyWithRetry(
        classifier,
        testCase.text,
      );

      const isCorrectIntent = output?.intent === testCase.expectedIntent;
      const isCorrectClaimType =
        testCase.expectedIntent === "claim_required_documents"
          ? output?.claimType === testCase.expectedClaimType
          : true;

      const evalResult: CaseEvaluationResult = {
        testCase,
        prediction: output,
        isCorrectIntent,
        isCorrectClaimType,
        latencyMs,
        error,
        runIndex,
      };

      results.push(evalResult);
      completedCount++;

      const statusTag = error
        ? "❌ ERR "
        : isCorrectIntent
          ? "✅ OK  "
          : "⚠️ FAIL";

      const runTag = runs > 1 ? `[Run ${runIndex}/${runs}] ` : "";
      console.log(
        `[${completedCount.toString().padStart(3, " ")}/${totalTasks}] ${runTag}${statusTag} ` +
          `"${testCase.text.padEnd(26, " ").slice(0, 26)}" ` +
          `-> ${output?.intent || "ERROR"} (exp: ${testCase.expectedIntent}) ` +
          `${output?.confidence ? `[conf: ${output.confidence.toFixed(2)}]` : ""} [${latencyMs}ms]`,
      );

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  const workerPromises = Array.from({ length: concurrency }, (_, i) =>
    worker(i + 1),
  );
  await Promise.all(workerPromises);

  return results;
}

async function exportReports(
  summary: EvaluationSummary,
  outDir: string,
): Promise<void> {
  await fs.mkdir(outDir, { recursive: true });

  // 1. JSON report
  const jsonPath = path.join(outDir, "latest-result.json");
  await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2), "utf8");

  // 2. Confusion Matrix CSV
  const csvPath = path.join(outDir, "latest-confusion-matrix.csv");
  await fs.writeFile(
    csvPath,
    exportConfusionMatrixCsv(summary.confusionMatrix),
    "utf8",
  );

  // 3. Markdown Summary
  const mdPath = path.join(outDir, "latest-summary.md");
  const markdownContent = [
    `# Gemini Intent Classification Evaluation Report`,
    ``,
    `- **Model**: \`${summary.model}\``,
    `- **Timestamp**: ${summary.timestamp}`,
    `- **Total Evaluated**: ${summary.totalEvaluated} cases`,
    `- **Overall Accuracy**: **${(summary.overallAccuracy * 100).toFixed(2)}%**`,
    `- **Claim Type (Hospital/Accident/Surg) Accuracy**: **${(summary.claimTypeAccuracy.accuracy * 100).toFixed(2)}%** (${summary.claimTypeAccuracy.correctDocsCases}/${summary.claimTypeAccuracy.totalDocsCases})`,
    `- **Average Latency**: ${summary.averageLatencyMs}ms`,
    summary.stability
      ? `- **Multi-run Stability Consistency Rate**: **${(summary.stability.consistencyRate * 100).toFixed(2)}%** (${summary.stability.consistentCases}/${summary.stability.totalCases})`
      : "",
    ``,
    `## Classification Metrics`,
    `\`\`\``,
    formatMetricsTable(summary),
    `\`\`\``,
    ``,
    `## Confusion Matrix`,
    `\`\`\``,
    formatConfusionMatrixTable(summary.confusionMatrix),
    `\`\`\``,
    ``,
    `## Misclassified Cases (Bad Cases: ${summary.badCases.length})`,
    summary.badCases.length === 0
      ? `🎉 No misclassified cases! All predictions matched ground truth.`
      : [
          `| ID | User Input | Expected Intent | Predicted Intent | Expected ClaimType | Predicted ClaimType | Confidence | Category |`,
          `|---|---|---|---|---|---|---|---|`,
          ...summary.badCases.map(
            (b) =>
              `| ${b.id} | ${b.text.replace(/\|/g, "/")} | \`${b.expectedIntent}\` | \`${b.predictedIntent}\` | ${b.expectedClaimType || "null"} | ${b.predictedClaimType || "null"} | ${b.confidence !== undefined ? b.confidence.toFixed(2) : "N/A"} | ${b.category} |`,
          ),
        ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  await fs.writeFile(mdPath, markdownContent, "utf8");

  console.log(`\n📁 Evaluation reports exported to:`);
  console.log(`   - JSON: ${jsonPath}`);
  console.log(`   - CSV:  ${csvPath}`);
  console.log(`   - MD:   ${mdPath}`);
}

async function main(): Promise<void> {
  const options = parseCliArgs();

  console.log("==========================================================");
  console.log(" Insurance Assistant - Intent Classifier Evaluation Tool   ");
  console.log("==========================================================");
  console.log(`Dataset:      ${options.datasetPath}`);
  console.log(`AI Provider:  ${env.AI_PROVIDER}`);
  console.log(`AI Model:     ${env.AI_MODEL}`);
  console.log(`Prompt Vers:  ${options.promptVersion.toUpperCase()}`);
  console.log(`Runs/Case:    ${options.runs}`);
  console.log(`Concurrency:  ${options.concurrency}`);
  console.log(`Delay:        ${options.delayMs}ms`);
  if (options.limit) {
    console.log(`Limit:        ${options.limit} cases`);
  }
  console.log("----------------------------------------------------------\n");

  const rawData = await fs.readFile(options.datasetPath, "utf8");
  let testCases: EvaluationTestCase[] = JSON.parse(rawData);

  if (options.limit && options.limit < testCases.length) {
    const byIntent = new Map<string, EvaluationTestCase[]>();
    for (const c of testCases) {
      if (!byIntent.has(c.expectedIntent)) byIntent.set(c.expectedIntent, []);
      byIntent.get(c.expectedIntent)!.push(c);
    }
    const sampled: EvaluationTestCase[] = [];
    let round = 0;
    while (sampled.length < options.limit) {
      let addedInRound = false;
      for (const list of byIntent.values()) {
        if (round < list.length && sampled.length < options.limit) {
          sampled.push(list[round]);
          addedInRound = true;
        }
      }
      round++;
      if (!addedInRound) break;
    }
    testCases = sampled;
  }

  const selectedPrompt =
    options.promptVersion === "v1" ? SYSTEM_PROMPT_V1 : SYSTEM_PROMPT_V2;
  const classifier = new VercelIntentClassifier(undefined, selectedPrompt);

  const startTime = Date.now();
  const results = await runEvaluationPool(
    testCases,
    classifier,
    options.runs,
    options.concurrency,
    options.delayMs,
  );
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  const stability = options.runs > 1 ? computeStability(results) : undefined;
  const summary = summarizeEvaluation(
    results,
    env.AI_MODEL,
    testCases.length,
    stability,
  );

  console.log("\n\n==========================================================");
  console.log("                     EVALUATION RESULTS                   ");
  console.log("==========================================================");
  console.log(formatMetricsTable(summary));
  console.log("\n----------------------------------------------------------");
  console.log("                      CONFUSION MATRIX                    ");
  console.log("----------------------------------------------------------");
  console.log(formatConfusionMatrixTable(summary.confusionMatrix));
  console.log("\n----------------------------------------------------------");
  console.log(`Completed in ${totalDuration}s.`);

  if (summary.badCases.length > 0) {
    console.log(
      `\n⚠️  Misclassified Cases (${summary.badCases.length} errors found):`,
    );
    console.table(
      summary.badCases.map((b) => ({
        id: b.id,
        text: b.text,
        expected: b.expectedIntent,
        predicted: b.predictedIntent,
        confidence: b.confidence ? b.confidence.toFixed(2) : "N/A",
        category: b.category,
      })),
    );
  } else {
    console.log("\n🎉 Perfect 100% accuracy on all evaluated cases!");
  }

  if (options.exportResults) {
    const resultsDir = path.resolve(__dirname, "./results");
    await exportReports(summary, resultsDir);
  }
}

main().catch((err) => {
  console.error("Evaluation failed:", err);
  process.exit(1);
});
