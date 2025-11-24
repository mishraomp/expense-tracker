/**
 * Performance Benchmark Script for Attachment Upload
 *
 * Measures:
 * - Upload latency (p50, p95, p99)
 * - Throughput (requests/sec)
 * - Bulk upload performance
 * - Concurrent upload stress test
 *
 * Usage:
 *   npm run benchmark:attachments
 *   node dist/scripts/benchmark-attachments-upload.js
 *
 * Requirements:
 * - Backend server running on localhost:3000
 * - Valid JWT token set in BENCHMARK_TOKEN env var
 * - Test files in /tmp/benchmark/ (auto-generated)
 */

import axios from 'axios';
import FormData from 'form-data';
import { randomBytes } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const API_URL = process.env.BENCHMARK_API_URL || 'http://localhost:3000/api/v1';
const TOKEN = process.env.BENCHMARK_TOKEN || '';
const ITERATIONS = parseInt(process.env.BENCHMARK_ITERATIONS || '50', 10);
const CONCURRENCY = parseInt(process.env.BENCHMARK_CONCURRENCY || '5', 10);

interface BenchmarkResult {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  avgLatency: number;
  totalDuration: number;
  throughput: number;
}

/**
 * Generates test files for benchmarking
 */
function generateTestFiles(count: number, sizeKB: number = 100): string[] {
  const dir = '/tmp/benchmark';
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const files: string[] = [];
  for (let i = 0; i < count; i++) {
    const filePath = join(dir, `test-file-${i}.bin`);
    const content = randomBytes(sizeKB * 1024);
    writeFileSync(filePath, content);
    files.push(filePath);
  }

  console.log(`Generated ${count} test files of ${sizeKB}KB each in ${dir}`);
  return files;
}

/**
 * Uploads a single attachment and measures latency
 */
async function uploadAttachment(
  filePath: string,
  recordType: 'expense' | 'income',
  recordId: string,
): Promise<number> {
  const startTime = Date.now();

  const formData = new FormData();
  formData.append('file', require('fs').createReadStream(filePath));
  formData.append('recordType', recordType);
  formData.append('recordId', recordId);

  await axios.post(`${API_URL}/attachments`, formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  return Date.now() - startTime;
}

/**
 * Runs sequential upload benchmark
 */
async function runSequentialBenchmark(files: string[]): Promise<BenchmarkResult> {
  console.log(`\n=== Sequential Upload Benchmark (${files.length} files) ===`);

  const startTime = Date.now();
  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const latency = await uploadAttachment(file, 'expense', 'test-record-id');
      latencies.push(latency);
      successCount++;
    } catch (error) {
      const err = error as any;
      console.error(`Upload failed: ${err?.message || 'unknown error'}`);
      errorCount++;
    }
  }

  const totalDuration = Date.now() - startTime;

  return calculateMetrics(files.length, successCount, errorCount, latencies, totalDuration);
}

/**
 * Runs concurrent upload benchmark
 */
async function runConcurrentBenchmark(
  files: string[],
  concurrency: number,
): Promise<BenchmarkResult> {
  console.log(
    `\n=== Concurrent Upload Benchmark (${files.length} files, ${concurrency} concurrent) ===`,
  );

  const startTime = Date.now();
  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Process files in batches with concurrency limit
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((file) => uploadAttachment(file, 'expense', 'test-record-id')),
    );

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        latencies.push(result.value);
        successCount++;
      } else {
        console.error(`Upload failed: ${result.reason.message}`);
        errorCount++;
      }
    });
  }

  const totalDuration = Date.now() - startTime;

  return calculateMetrics(files.length, successCount, errorCount, latencies, totalDuration);
}

/**
 * Calculates benchmark metrics
 */
function calculateMetrics(
  totalRequests: number,
  successCount: number,
  errorCount: number,
  latencies: number[],
  totalDuration: number,
): BenchmarkResult {
  latencies.sort((a, b) => a - b);

  const p50Index = Math.floor(latencies.length * 0.5);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);

  const p50 = latencies[p50Index] || 0;
  const p95 = latencies[p95Index] || 0;
  const p99 = latencies[p99Index] || 0;
  const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0;
  const throughput = (successCount / totalDuration) * 1000; // requests/sec

  return {
    totalRequests,
    successCount,
    errorCount,
    latencies,
    p50,
    p95,
    p99,
    avgLatency,
    totalDuration,
    throughput,
  };
}

/**
 * Prints benchmark results
 */
function printResults(label: string, results: BenchmarkResult) {
  console.log(`\n--- ${label} Results ---`);
  console.log(`Total Requests: ${results.totalRequests}`);
  console.log(`Success: ${results.successCount}, Errors: ${results.errorCount}`);
  console.log(`Duration: ${results.totalDuration}ms`);
  console.log(
    `Latency (ms): P50=${results.p50}, P95=${results.p95}, P99=${results.p99}, Avg=${results.avgLatency.toFixed(2)}`,
  );
  console.log(`Throughput: ${results.throughput.toFixed(2)} req/s`);
}

/**
 * Main benchmark execution
 */
async function main() {
  console.log('Starting Attachment Upload Performance Benchmark...');
  console.log(`API URL: ${API_URL}`);
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Concurrency: ${CONCURRENCY}`);

  if (!TOKEN) {
    console.error('ERROR: BENCHMARK_TOKEN environment variable not set');
    process.exit(1);
  }

  // Generate test files
  const files = generateTestFiles(ITERATIONS, 100); // 100KB files

  try {
    // Run sequential benchmark
    const sequentialResults = await runSequentialBenchmark(files);
    printResults('Sequential Upload', sequentialResults);

    // Run concurrent benchmark
    const concurrentResults = await runConcurrentBenchmark(files, CONCURRENCY);
    printResults('Concurrent Upload', concurrentResults);

    console.log('\n=== Benchmark Complete ===');
    console.log('Performance Summary:');
    console.log(
      `Sequential: ${sequentialResults.throughput.toFixed(2)} req/s, P95=${sequentialResults.p95}ms`,
    );
    console.log(
      `Concurrent (${CONCURRENCY}): ${concurrentResults.throughput.toFixed(2)} req/s, P95=${concurrentResults.p95}ms`,
    );
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

main();
