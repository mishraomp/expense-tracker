#!/usr/bin/env node
/**
 * format-k6-results.js
 * Convert k6 JSON output to CSV format for easier analysis in spreadsheets
 *
 * Usage:
 *   node format-k6-results.js results/baseline.json > results/baseline.csv
 *   node format-k6-results.js results/baseline.json --output results/baseline.csv
 */

const fs = require("fs");
const path = require("path");

function parseK6Results(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");

  const metrics = {};
  const points = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const data = JSON.parse(line);

      if (data.type === "Metric" && data.data) {
        const metricName = data.data.name || data.metric;
        metrics[metricName] = {
          type: data.data.type,
          contains: data.data.contains,
        };
      }

      if (data.type === "Point" && data.data) {
        points.push({
          metric: data.data.name || data.metric,
          time: data.data.time,
          value: data.data.value,
          tags: data.data.tags || {},
        });
      }
    } catch (err) {
      // Skip invalid lines
      continue;
    }
  }

  return { metrics, points };
}

function aggregateMetrics(points) {
  const aggregated = {};

  for (const point of points) {
    const { metric, value } = point;

    if (!aggregated[metric]) {
      aggregated[metric] = {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        values: [],
      };
    }

    const agg = aggregated[metric];
    agg.count++;
    agg.sum += value;
    agg.min = Math.min(agg.min, value);
    agg.max = Math.max(agg.max, value);
    agg.values.push(value);
  }

  // Calculate percentiles
  for (const metric in aggregated) {
    const agg = aggregated[metric];
    agg.avg = agg.sum / agg.count;

    const sorted = agg.values.sort((a, b) => a - b);
    agg.p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    agg.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    agg.p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  }

  return aggregated;
}

function formatAsCSV(aggregated) {
  const rows = [["Metric", "Count", "Avg", "Min", "Max", "P50", "P95", "P99"]];

  for (const [metric, agg] of Object.entries(aggregated)) {
    rows.push([
      metric,
      agg.count.toString(),
      agg.avg.toFixed(4),
      agg.min.toFixed(4),
      agg.max.toFixed(4),
      agg.p50.toFixed(4),
      agg.p95.toFixed(4),
      agg.p99.toFixed(4),
    ]);
  }

  return rows.map((row) => row.join(",")).join("\n");
}

function formatAsTable(aggregated) {
  const rows = [];

  rows.push(
    "Metric                          Count      Avg        Min        Max        P50        P95        P99"
  );
  rows.push("-".repeat(110));

  for (const [metric, agg] of Object.entries(aggregated)) {
    const metricPad = metric.padEnd(30);
    const countPad = agg.count.toString().padStart(8);
    const avgPad = agg.avg.toFixed(2).padStart(10);
    const minPad = agg.min.toFixed(2).padStart(10);
    const maxPad = agg.max.toFixed(2).padStart(10);
    const p50Pad = agg.p50.toFixed(2).padStart(10);
    const p95Pad = agg.p95.toFixed(2).padStart(10);
    const p99Pad = agg.p99.toFixed(2).padStart(10);

    rows.push(
      `${metricPad} ${countPad} ${avgPad} ${minPad} ${maxPad} ${p50Pad} ${p95Pad} ${p99Pad}`
    );
  }

  return rows.join("\n");
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error("Usage: node format-k6-results.js <input.json> [options]");
  console.error("");
  console.error("Options:");
  console.error("  --output <file>    Write to file instead of stdout");
  console.error("  --format <format>  Output format: csv (default) or table");
  console.error("");
  console.error("Examples:");
  console.error(
    "  node format-k6-results.js results/baseline.json > results/baseline.csv"
  );
  console.error(
    "  node format-k6-results.js results/baseline.json --output results/baseline.csv"
  );
  console.error(
    "  node format-k6-results.js results/baseline.json --format table"
  );
  process.exit(1);
}

const inputFile = args[0];
let outputFile = null;
let format = "csv";

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--output" && i + 1 < args.length) {
    outputFile = args[i + 1];
    i++;
  } else if (args[i] === "--format" && i + 1 < args.length) {
    format = args[i + 1];
    i++;
  }
}

try {
  const { points } = parseK6Results(inputFile);
  const aggregated = aggregateMetrics(points);

  let output;
  if (format === "table") {
    output = formatAsTable(aggregated);
  } else {
    output = formatAsCSV(aggregated);
  }

  if (outputFile) {
    fs.writeFileSync(outputFile, output);
    console.error(`Results written to: ${outputFile}`);
  } else {
    console.log(output);
  }
} catch (error) {
  console.error("Error formatting results:", error.message);
  process.exit(1);
}
