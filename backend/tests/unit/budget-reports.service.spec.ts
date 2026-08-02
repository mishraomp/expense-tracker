import { describe, it, expect, vi } from 'vitest';
import { BudgetReportsService } from '../../src/modules/reports/budget-reports.service';
import { Decimal } from '@prisma/client/runtime/client.js';

describe('BudgetReportsService', () => {
  it('getBudgetVsActual returns budget points per month', async () => {
    const categoryBudgets = [
      {
        amount: new Decimal('100.00'),
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      },
    ];
    const rows = [{ bucket: new Date('2025-01-01'), actual: '10' }];
    const mockPrisma = {
      budget: {
        findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(categoryBudgets),
      },
      $queryRaw: vi.fn().mockResolvedValueOnce(rows),
    } as any;
    const svc = new (BudgetReportsService as any)(mockPrisma);
    const res = await svc.getBudgetVsActual('user-1', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    } as any);
    expect(res).toHaveLength(1);
    expect(res[0].budgetAmount).toBe('100');
  });

  it('getCategoryBudgetReport maps rows to DTO', async () => {
    const row = [
      {
        category_id: 'cat-1',
        category_name: 'Cat 1',
        category_type: 'expense',
        color_code: null,
        icon: null,
        user_id: null,
        budget_amount: '50',
        budget_period: 'monthly',
        period_start: null,
        period_end: null,
        total_spent: '25',
        percent_used: '50',
        remaining_budget: '25',
        is_over_budget: false,
        over_budget_amount: null,
      },
    ];
    const mockPrisma = { $queryRaw: vi.fn().mockResolvedValueOnce(row) } as any;
    const svc = new (BudgetReportsService as any)(mockPrisma);
    const res = await svc.getCategoryBudgetReport('user-1', { startDate: '2025-01-01' } as any);
    expect(res).toHaveLength(1);
    expect(res[0].category_id).toBe('cat-1');
  });

  it('getSubcategoryBudgetReport maps rows to DTO', async () => {
    const row = [
      {
        subcategory_id: 'sub-1',
        subcategory_name: 'Sub 1',
        category_id: 'cat-1',
        category_name: 'Cat 1',
        category_type: 'expense',
        category_color: null,
        category_icon: null,
        user_id: null,
        budget_amount: '25',
        budget_period: 'monthly',
        period_start: null,
        period_end: null,
        total_spent: '10',
        percent_used: '40',
        remaining_budget: '15',
        is_over_budget: false,
        over_budget_amount: null,
      },
    ];
    const mockPrisma = { $queryRaw: vi.fn().mockResolvedValueOnce(row) } as any;
    const svc = new (BudgetReportsService as any)(mockPrisma);
    const res = await svc.getSubcategoryBudgetReport('user-1', { startDate: '2025-01-01' } as any);
    expect(res).toHaveLength(1);
    expect(res[0].subcategory_id).toBe('sub-1');
  });

  describe('Budget overlap and precedence in reports', () => {
    it('getCategoryBudgetReport uses period_start and period_end from budget table', async () => {
      const row = [
        {
          category_id: 'cat-1',
          category_name: 'Cat 1',
          category_type: 'expense',
          color_code: null,
          icon: null,
          user_id: null,
          budget_amount: '100',
          budget_period: 'monthly',
          period_start: new Date('2025-01-01'),
          period_end: new Date('2025-01-31'),
          total_spent: '50',
          percent_used: '50',
          remaining_budget: '50',
          is_over_budget: false,
          over_budget_amount: null,
        },
      ];
      const mockPrisma = { $queryRaw: vi.fn().mockResolvedValueOnce(row) } as any;
      const svc = new (BudgetReportsService as any)(mockPrisma);
      const res = await svc.getCategoryBudgetReport('user-1', { startDate: '2025-01-01' } as any);
      expect(res).toHaveLength(1);
      expect(res[0].period_start).toBeInstanceOf(Date);
      expect(res[0].period_end).toBeInstanceOf(Date);
    });

    it('getSubcategoryBudgetReport uses period_start and period_end from budget table', async () => {
      const row = [
        {
          subcategory_id: 'sub-1',
          subcategory_name: 'Sub 1',
          category_id: 'cat-1',
          category_name: 'Cat 1',
          category_type: 'expense',
          category_color: null,
          category_icon: null,
          user_id: null,
          budget_amount: '75',
          budget_period: 'monthly',
          period_start: new Date('2025-02-01'),
          period_end: new Date('2025-02-28'),
          total_spent: '30',
          percent_used: '40',
          remaining_budget: '45',
          is_over_budget: false,
          over_budget_amount: null,
        },
      ];
      const mockPrisma = { $queryRaw: vi.fn().mockResolvedValueOnce(row) } as any;
      const svc = new (BudgetReportsService as any)(mockPrisma);
      const res = await svc.getSubcategoryBudgetReport('user-1', {
        startDate: '2025-02-01',
      } as any);
      expect(res).toHaveLength(1);
      expect(res[0].period_start).toBeInstanceOf(Date);
      expect(res[0].period_end).toBeInstanceOf(Date);
    });

    it('getBudgetVsActual correctly aggregates monthly budget from budget table', async () => {
      const categoryBudgets = [
        {
          amount: new Decimal('200.00'),
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      ];
      const rows = [
        { bucket: new Date('2025-01-01'), actual: '75' },
        { bucket: new Date('2025-02-01'), actual: '50' },
      ];
      const mockPrisma = {
        budget: {
          findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(categoryBudgets),
        },
        $queryRaw: vi.fn().mockResolvedValueOnce(rows),
      } as any;
      const svc = new (BudgetReportsService as any)(mockPrisma);
      const res = await svc.getBudgetVsActual('user-1', {
        startDate: '2025-01-01',
        endDate: '2025-02-28',
      } as any);
      expect(res).toHaveLength(2);
      expect(res[0].budgetAmount).toBe('200');
      expect(res[1].budgetAmount).toBe('200');
    });
  });
});
