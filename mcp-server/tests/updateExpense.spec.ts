import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/apiClient.js', () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

import { apiRequest } from '../src/apiClient.js';
import { registerUpdateExpense } from '../src/tools/updateExpense.js';
import { invalidateCategoryCache } from '../src/categoryLookup.js';

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

describe('update_expense tool', () => {
  beforeEach(() => {
    invalidateCategoryCache();
    mockApiRequest.mockReset();
  });

  it('resolves categoryName and subcategoryName to ids before calling PUT', async () => {
    mockApiRequest
      .mockResolvedValueOnce([{ id: 'cat-1', name: 'Food' }]) // GET /categories
      .mockResolvedValueOnce([{ id: 'sub-1', name: 'Groceries', categoryId: 'cat-1' }]) // GET /subcategories
      .mockResolvedValueOnce({ id: 'exp-1', amount: 20, date: '2026-01-15' }); // PUT /expenses/:id

    const handler = captureHandler(registerUpdateExpense);
    await handler({
      id: 'exp-1',
      amount: 20,
      categoryName: 'Food',
      subcategoryName: 'Groceries',
    });

    const putCall = mockApiRequest.mock.calls[2];
    expect(putCall[0]).toBe('/expenses/exp-1');
    expect((putCall[1] as any).method).toBe('PUT');
    expect((putCall[1] as any).body).toMatchObject({ categoryId: 'cat-1', subcategoryId: 'sub-1' });
  });

  it('does not attempt subcategory resolution when no categoryName is given', async () => {
    mockApiRequest.mockResolvedValueOnce({ id: 'exp-1', amount: 20, date: '2026-01-15' });

    const handler = captureHandler(registerUpdateExpense);
    await handler({ id: 'exp-1', amount: 20, subcategoryName: 'Groceries' });

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    const putCall = mockApiRequest.mock.calls[0];
    expect((putCall[1] as any).body.subcategoryId).toBeUndefined();
  });
});
