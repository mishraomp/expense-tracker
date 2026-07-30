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
import {
  resolveCategoryId,
  resolveSubcategoryId,
  listCategories,
  invalidateCategoryCache,
} from '../src/categoryLookup.js';

const mockApiRequest = vi.mocked(apiRequest);

describe('categoryLookup', () => {
  beforeEach(() => {
    invalidateCategoryCache();
    mockApiRequest.mockReset();
  });

  it('resolves a category id by case-insensitive name match', async () => {
    mockApiRequest.mockResolvedValueOnce([
      { id: 'cat-1', name: 'Food' },
      { id: 'cat-2', name: 'Entertainment' },
    ]);

    const id = await resolveCategoryId('food');
    expect(id).toBe('cat-1');
  });

  it('caches the category list across calls within one process', async () => {
    mockApiRequest.mockResolvedValueOnce([{ id: 'cat-1', name: 'Food' }]);

    await resolveCategoryId('Food');
    await resolveCategoryId('Food');

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error listing available names when no category matches', async () => {
    mockApiRequest.mockResolvedValueOnce([{ id: 'cat-1', name: 'Food' }]);

    await expect(resolveCategoryId('Nonexistent')).rejects.toThrow(/Food/);
  });

  it('resolves a subcategory id scoped to its parent category', async () => {
    mockApiRequest.mockResolvedValueOnce([{ id: 'sub-1', name: 'Groceries', categoryId: 'cat-1' }]);

    const id = await resolveSubcategoryId('cat-1', 'groceries');

    expect(id).toBe('sub-1');
    expect(mockApiRequest).toHaveBeenCalledWith('/subcategories', { query: { categoryId: 'cat-1' } });
  });

  it('listCategories returns the raw category list', async () => {
    mockApiRequest.mockResolvedValueOnce([{ id: 'cat-1', name: 'Food' }]);
    const categories = await listCategories();
    expect(categories).toEqual([{ id: 'cat-1', name: 'Food' }]);
  });
});
