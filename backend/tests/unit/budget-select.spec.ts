import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/client.js';
import {
  deriveBudgetPeriod,
  selectEffectiveBudget,
  selectActiveCategoryBudget,
  selectActiveSubcategoryBudget,
  computeBudgetDateRange,
} from '../../src/common/budgets/budget-select';

describe('budget-select', () => {
  describe('deriveBudgetPeriod', () => {
    it('returns null for wide range (legacy recurring)', () => {
      const result = deriveBudgetPeriod(new Date('1970-01-01'), new Date('9999-12-31'));
      expect(result).toBeNull();
    });

    it('returns null for arbitrary date range', () => {
      const result = deriveBudgetPeriod(new Date('2025-01-15'), new Date('2025-02-15'));
      expect(result).toBeNull();
    });

    it('returns null for partial month', () => {
      const result = deriveBudgetPeriod(new Date('2025-01-01'), new Date('2025-01-15'));
      expect(result).toBeNull();
    });

    it('returns null for cross-month ranges', () => {
      const result = deriveBudgetPeriod(new Date('2025-01-01'), new Date('2025-02-28'));
      expect(result).toBeNull();
    });
  });

  describe('computeBudgetDateRange', () => {
    it('uses explicit dates when provided', () => {
      const result = computeBudgetDateRange(undefined, '2025-03-01', '2025-03-31');
      expect(result.startDate).toEqual(new Date('2025-03-01'));
      expect(result.endDate).toEqual(new Date('2025-03-31'));
    });

    it('computes monthly period for current month', () => {
      const result = computeBudgetDateRange('monthly');
      const now = new Date();
      const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const expectedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      expect(result.startDate).toEqual(expectedStart);
      expect(result.endDate).toEqual(expectedEnd);
    });

    it('computes annual period for current year', () => {
      const result = computeBudgetDateRange('annual');
      const now = new Date();
      const expectedStart = new Date(now.getFullYear(), 0, 1);
      const expectedEnd = new Date(now.getFullYear(), 11, 31);
      expect(result.startDate).toEqual(expectedStart);
      expect(result.endDate).toEqual(expectedEnd);
    });

    it('returns wide range for no period (legacy recurring)', () => {
      const result = computeBudgetDateRange();
      expect(result.startDate).toEqual(new Date('1970-01-01'));
      expect(result.endDate).toEqual(new Date('9999-12-31'));
    });

    it('returns wide range for null period', () => {
      const result = computeBudgetDateRange(null, null, null);
      expect(result.startDate).toEqual(new Date('1970-01-01'));
      expect(result.endDate).toEqual(new Date('9999-12-31'));
    });
  });

  describe('selectActiveCategoryBudget', () => {
    it('returns budget when target date falls within range', async () => {
      const mockBudget = {
        id: 'budget-1',
        amount: new Decimal('100'),
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        categoryId: 'cat-1',
        subcategoryId: null,
      };
      const mockPrisma = {
        budget: {
          findFirst: vi.fn().mockResolvedValue(mockBudget),
        },
      } as any;

      const result = await selectActiveCategoryBudget(mockPrisma, 'cat-1', new Date('2025-01-15'));
      expect(result).toEqual(mockBudget);
      expect(mockPrisma.budget.findFirst).toHaveBeenCalledWith({
        where: {
          categoryId: 'cat-1',
          startDate: { lte: expect.any(Date) },
          endDate: { gte: expect.any(Date) },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      });
    });

    it('returns null when no budget covers target date', async () => {
      const mockPrisma = {
        budget: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as any;

      const result = await selectActiveCategoryBudget(mockPrisma, 'cat-1', new Date('2025-03-15'));
      expect(result).toBeNull();
    });
  });

  describe('selectActiveSubcategoryBudget', () => {
    it('returns budget when target date falls within range', async () => {
      const mockBudget = {
        id: 'budget-2',
        amount: new Decimal('50'),
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        categoryId: null,
        subcategoryId: 'sub-1',
      };
      const mockPrisma = {
        budget: {
          findFirst: vi.fn().mockResolvedValue(mockBudget),
        },
      } as any;

      const result = await selectActiveSubcategoryBudget(
        mockPrisma,
        'sub-1',
        new Date('2025-02-15'),
      );
      expect(result).toEqual(mockBudget);
    });
  });

  describe('selectEffectiveBudget', () => {
    it('returns subcategory budget when both exist (precedence rule)', async () => {
      const catBudget = {
        id: 'cat-budget',
        amount: new Decimal('100'),
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        categoryId: 'cat-1',
        subcategoryId: null,
      };
      const subBudget = {
        id: 'sub-budget',
        amount: new Decimal('50'),
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        categoryId: null,
        subcategoryId: 'sub-1',
      };
      const mockPrisma = {
        budget: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(subBudget) // First call for subcategory
            .mockResolvedValueOnce(catBudget), // Second call for category (not reached)
        },
      } as any;

      const result = await selectEffectiveBudget(
        mockPrisma,
        'cat-1',
        'sub-1',
        new Date('2025-01-15'),
      );

      expect(result.budgetSource).toBe('subcategory');
      expect(result.budgetAmount).toEqual(new Decimal('50'));
      expect(result.budget?.id).toBe('sub-budget');
    });

    it('falls back to category budget when subcategory has no budget', async () => {
      const catBudget = {
        id: 'cat-budget',
        amount: new Decimal('100'),
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        categoryId: 'cat-1',
        subcategoryId: null,
      };
      const mockPrisma = {
        budget: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(null) // No subcategory budget
            .mockResolvedValueOnce(catBudget), // Category budget
        },
      } as any;

      const result = await selectEffectiveBudget(
        mockPrisma,
        'cat-1',
        'sub-1',
        new Date('2025-01-15'),
      );

      expect(result.budgetSource).toBe('category');
      expect(result.budgetAmount).toEqual(new Decimal('100'));
    });

    it('returns null values when no budgets exist', async () => {
      const mockPrisma = {
        budget: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as any;

      const result = await selectEffectiveBudget(
        mockPrisma,
        'cat-1',
        'sub-1',
        new Date('2025-01-15'),
      );

      expect(result.budgetAmount).toBeNull();
      expect(result.budgetPeriod).toBeNull();
      expect(result.budgetSource).toBeNull();
      expect(result.budget).toBeNull();
    });

    it('uses category budget directly when no subcategoryId provided', async () => {
      const catBudget = {
        id: 'cat-budget',
        amount: new Decimal('200'),
        startDate: new Date('1970-01-01'), // Wide range (legacy recurring)
        endDate: new Date('9999-12-31'),
        categoryId: 'cat-1',
        subcategoryId: null,
      };
      const mockPrisma = {
        budget: {
          findFirst: vi.fn().mockResolvedValue(catBudget),
        },
      } as any;

      const result = await selectEffectiveBudget(mockPrisma, 'cat-1', null, new Date('2025-06-15'));

      expect(result.budgetSource).toBe('category');
      expect(result.budgetPeriod).toBeNull(); // Wide range returns null period
    });
  });

  describe('Budget overlap selection (most recent wins)', () => {
    it('selects budget with greatest updated_at among overlapping budgets', async () => {
      // The mock simulates the DB query already returning the correct order
      const mostRecentBudget = {
        id: 'budget-recent',
        amount: new Decimal('150'),
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        categoryId: 'cat-1',
        subcategoryId: null,
        updatedAt: new Date('2025-01-20T12:00:00Z'),
      };
      const mockPrisma = {
        budget: {
          findFirst: vi.fn().mockResolvedValue(mostRecentBudget),
        },
      } as any;

      const result = await selectActiveCategoryBudget(mockPrisma, 'cat-1', new Date('2025-01-15'));

      expect(result?.id).toBe('budget-recent');
      // Verify orderBy was used correctly
      expect(mockPrisma.budget.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });
  });
});
