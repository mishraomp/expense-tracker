import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/apiClient.js', () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

import { apiRequest } from '../src/apiClient.js';
import { registerAddExpense } from '../src/tools/addExpense.js';

const mockApiRequest = vi.mocked(apiRequest);

function captureHandler(register: (server: any) => void) {
  let handler: any;
  register({
    registerTool: (_name: string, _config: unknown, cb: any) => {
      handler = cb;
    },
  });
  return handler;
}

describe('add_expense tool', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it('reports success with the created expense id', async () => {
    mockApiRequest.mockResolvedValueOnce({
      created: [{ id: 'exp-1', amount: 12.5 }],
      duplicates: [],
      failed: [],
      summary: { total: 1, created: 1, duplicates: 0, failed: 0 },
    });

    const handler = captureHandler(registerAddExpense);
    const result = await handler({ amount: 12.5, categoryName: 'Food', date: '2026-01-15' });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('exp-1');
    expect(result.content[0].text).toContain('$12.50');
  });

  it('reports a duplicate instead of a false success', async () => {
    mockApiRequest.mockResolvedValueOnce({
      created: [],
      duplicates: [{ index: 0, reason: 'Same amount/category/date already exists' }],
      failed: [],
      summary: { total: 1, created: 0, duplicates: 1, failed: 0 },
    });

    const handler = captureHandler(registerAddExpense);
    const result = await handler({ amount: 12.5, categoryName: 'Food', date: '2026-01-15' });

    expect(result.content[0].text.toLowerCase()).toContain('duplicate');
  });

  it('surfaces API errors as a tool error instead of throwing', async () => {
    mockApiRequest.mockRejectedValueOnce(new Error('boom'));

    const handler = captureHandler(registerAddExpense);
    const result = await handler({ amount: 12.5, categoryName: 'Food', date: '2026-01-15' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('boom');
  });

  it('defaults date to today when omitted', async () => {
    mockApiRequest.mockResolvedValueOnce({
      created: [{ id: 'exp-2', amount: 5 }],
      duplicates: [],
      failed: [],
      summary: { total: 1, created: 1, duplicates: 0, failed: 0 },
    });

    const handler = captureHandler(registerAddExpense);
    await handler({ amount: 5, categoryName: 'Food' });

    const [, options] = mockApiRequest.mock.calls[0];
    const sentExpense = (options as any).body.expenses[0];
    expect(sentExpense.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
