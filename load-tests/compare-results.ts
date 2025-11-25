#!/usr/bin/env node
/**
 * compare-results.ts
 * Compare two k6 JSON result files and show performance improvements/regressions
 *
 * Usage:
 *   node compare-results.ts results/baseline-before.json results/baseline-after.json
 *   ts-node compare-results.ts results/baseline-before.json results/baseline-after.json
 */

import * as fs from "fs";
import * as path from "path";

interface K6Metric {
  type: string;
  contains: string;
  values: {
    [key: string]: number;
  };
}

interface K6Result {
  metrics: {
    [key: string]: K6Metric;
  };
}

function loadK6Results(filePath: string): K6Result {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");

  // k6 JSON output is newline-delimited JSON
  // We need to parse each line and aggregate metrics
  const metrics: { [key: string]: K6Metric } = {};

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const data = JSON.parse(line);

      if (data.type === "Metric" && data.data) {
        const metricName = data.data.name || data.metric;
        if (!metrics[metricName]) {
          metrics[metricName] = {
            type: data.data.type,
            contains: data.data.contains,
            values: {},
          };
        }
      }

      if (data.type === "Point" && data.data) {
        const metricName = data.data.name || data.metric;
        const value = data.data.value;
        const tags = data.data.tags || {};

        if (metricName && value !== undefined) {
          if (!metrics[metricName]) {
            metrics[metricName] = {
              type: "trend",
              contains: "time",
              values: {},
            };
          }

          // Store latest value (k6 outputs multiple points)
          metrics[metricName].values.value = value;
        }
      }
    } catch (err) {
      // Skip invalid JSON lines
      continue;
    }
  }

  return { metrics };
}

function extractMetricValue(
  metric: K6Metric | undefined,
  key: string = "value"
): number | null {
  if (!metric || !metric.values || metric.values[key] === undefined) {
    return null;
  }
  return metric.values[key];
}

function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function calculateImprovement(
  before: number,
  after: number,
  lowerIsBetter: boolean = true
): { diff: number; pct: string; arrow: string } {
  const diff = after - before;
  const pctChange = before !== 0 ? (diff / before) * 100 : 0;

  let arrow = "";
  if (lowerIsBetter) {
    arrow = diff < 0 ? "⬇️" : diff > 0 ? "⬆️" : "➡️";
  } else {
    arrow = diff > 0 ? "⬆️" : diff < 0 ? "⬇️" : "➡️";
  }

  return {
    diff,
    pct: `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}%`,
    arrow,
  };
}

function compareResults(beforeFile: string, afterFile: string): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Comparing k6 Results`);
  console.log(`${"=".repeat(80)}\n`);
  console.log(`Before: ${path.basename(beforeFile)}`);
  console.log(`After:  ${path.basename(afterFile)}\n`);

  const before = loadK6Results(beforeFile);
  const after = loadK6Results(afterFile);

  // Key metrics to compare
  const metricsToCompare = [
    {
      name: "http_req_duration",
      label: "Request Duration (avg)",
      unit: "ms",
      lowerIsBetter: true,
    },
    {
      name: "http_req_duration",
      label: "Request Duration (p95)",
      key: "p(95)",
      unit: "ms",
      lowerIsBetter: true,
    },
    {
      name: "http_req_duration",
      label: "Request Duration (p99)",
      key: "p(99)",
      unit: "ms",
      lowerIsBetter: true,
    },
    {
      name: "http_req_failed",
      label: "Failed Requests",
      unit: "%",
      lowerIsBetter: true,
    },
    {
      name: "http_reqs",
      label: "Requests/sec",
      unit: "rps",
      lowerIsBetter: false,
    },
    {
      name: "http_req_waiting",
      label: "Time to First Byte (avg)",
      unit: "ms",
      lowerIsBetter: true,
    },
    {
      name: "iteration_duration",
      label: "Iteration Duration (avg)",
      unit: "ms",
      lowerIsBetter: true,
    },
  ];

  console.log(
    `${"Metric".padEnd(35)} ${"Before".padEnd(12)} ${"After".padEnd(
      12
    )} ${"Change".padEnd(15)} ${"Impact"}`
  );
  console.log(`${"-".repeat(80)}`);

  for (const metric of metricsToCompare) {
    const beforeMetric = before.metrics[metric.name];
    const afterMetric = after.metrics[metric.name];

    const beforeValue = extractMetricValue(beforeMetric, metric.key || "avg");
    const afterValue = extractMetricValue(afterMetric, metric.key || "avg");

    if (beforeValue === null || afterValue === null) {
      console.log(
        `${metric.label.padEnd(35)} ${"N/A".padEnd(12)} ${"N/A".padEnd(
          12
        )} ${"N/A".padEnd(15)} -`
      );
      continue;
    }

    let beforeStr: string;
    let afterStr: string;

    if (metric.unit === "%") {
      beforeStr = formatPercentage(beforeValue);
      afterStr = formatPercentage(afterValue);
    } else if (metric.unit === "ms") {
      beforeStr = formatDuration(beforeValue);
      afterStr = formatDuration(afterValue);
    } else {
      beforeStr = beforeValue.toFixed(2);
      afterStr = afterValue.toFixed(2);
    }

    const improvement = calculateImprovement(
      beforeValue,
      afterValue,
      metric.lowerIsBetter
    );
    const changeStr = `${improvement.pct}`;

    console.log(
      `${metric.label.padEnd(35)} ${beforeStr.padEnd(12)} ${afterStr.padEnd(
        12
      )} ${changeStr.padEnd(15)} ${improvement.arrow}`
    );
  }

  console.log(`\n${"=".repeat(80)}\n`);

  // Summary
  const p95Before = extractMetricValue(
    before.metrics["http_req_duration"],
    "p(95)"
  );
  const p95After = extractMetricValue(
    after.metrics["http_req_duration"],
    "p(95)"
  );

  if (p95Before && p95After) {
    const improvement = calculateImprovement(p95Before, p95After, true);

    console.log(`Summary:`);
    console.log(`  P95 latency changed by ${improvement.pct}`);

    if (improvement.diff < 0) {
      console.log(
        `  ✅ Performance improved by ${formatDuration(
          Math.abs(improvement.diff)
        )} (faster)`
      );
    } else if (improvement.diff > 0) {
      console.log(
        `  ⚠️  Performance regressed by ${formatDuration(
          improvement.diff
        )} (slower)`
      );
    } else {
      console.log(`  ➡️  No significant change in performance`);
    }
  }

  console.log();
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: node compare-results.ts <before.json> <after.json>");
  console.error("");
  console.error("Example:");
  console.error(
    "  node compare-results.ts results/baseline-before.json results/baseline-after.json"
  );
  process.exit(1);
}

const [beforeFile, afterFile] = args;

try {
  compareResults(beforeFile, afterFile);
} catch (error) {
  console.error("Error comparing results:", error);
  process.exit(1);
}
