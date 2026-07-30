import { ApiError } from './apiClient.js';
import { log } from './log.js';

export interface ToolResult {
  // Index signature required to satisfy the SDK's CallToolResult shape.
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export function textResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

export function errorResult(err: unknown): ToolResult {
  const text = err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text }], isError: true };
}

export async function runTool(
  tool: string,
  args: unknown,
  fn: () => Promise<ToolResult>,
): Promise<ToolResult> {
  const start = Date.now();
  try {
    const result = await fn();
    log('tool_call', { tool, arguments: args, result: result.content[0]?.text, durationMs: Date.now() - start });
    return result;
  } catch (err) {
    log('tool_call_error', { tool, arguments: args, error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - start });
    return errorResult(err);
  }
}

export function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
