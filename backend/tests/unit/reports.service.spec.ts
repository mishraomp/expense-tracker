import { describe, it, expect, vi } from 'vitest';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { Decimal } from '@prisma/client/runtime/client.js';

describe('ReportsService', () => {
  it('getSpendingOverTime maps rows to response dto', async () => {
    const mockRows = [{ bucket: new Date('2025-01-01'), amount: '123.45' }];
    const mockPrisma = { $queryRaw: vi.fn().mockResolvedValue(mockRows) } as any;
    const svc = new ReportsService(mockPrisma);

    const res = await svc.getSpendingOverTime('user-1', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      interval: 'month',
    } as any);

    expect(res.data).toHaveLength(1);
    expect(res.data[0].bucket).toBe('2025-01-01');
    expect(res.data[0].amount).toBe('123.45');
    expect(res.meta.interval).toBe('month');
  });

  it('getIncomeVsExpense returns parsed totals and monthly breakdown', async () => {
    const incomeRow = [{ total: '200.00' }];
    const expenseRow = [{ total: '50.00' }];
    const monthlyData = [{ month: '2025-01', income: '100.00', expenses: '25.00' }];
    const subcategoryRows = [
      {
        month: '2025-01',
        subcategory_id: 'sub-1',
        subcategory_name: 'Sub 1',
        category_id: 'cat-1',
        category_name: 'Cat1',
        color_code: null,
        amount: '25.00',
      },
    ];

    const mockPrisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce(incomeRow)
        .mockResolvedValueOnce(expenseRow)
        .mockResolvedValueOnce(monthlyData)
        .mockResolvedValueOnce(subcategoryRows),
    } as any;
    const svc = new ReportsService(mockPrisma);

    const res = await svc.getIncomeVsExpense('user-1', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    } as any);
    expect(res.totalIncome).toBe(200);
    expect(res.totalExpenses).toBe(50);
    expect(res.incomeByMonth).toHaveLength(1);
    expect(res.expensesBySubcategoryByMonth).toHaveLength(1);
    expect(res.incomeByMonth[0].month).toBe('2025-01');
  });

  it('getSpendingByCategory returns mapped categories', async () => {
    const rows = [{ id: 'cat-1', name: 'Cat 1', color_code: 'red', amount: '250' }];
    const mockPrisma = { $queryRaw: vi.fn().mockResolvedValueOnce(rows) } as any;
    const svc = new (ReportsService as any)(mockPrisma);
    const res = await svc.getSpendingByCategory('user-1', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    } as any);
    expect(res).toHaveLength(1);
    expect(res[0].categoryId).toBe('cat-1');
    expect(res[0].amount).toBe('250');
  });

  it('getSpendingBySubcategory returns mapped subcategories', async () => {
    const rows = [
      {
        subcategory_id: 'sub-1',
        subcategory_name: 'Sub 1',
        category_id: 'cat-1',
        category_name: 'Cat 1',
        color_code: 'blue',
        amount: '75',
      },
    ];
    const mockPrisma = { $queryRaw: vi.fn().mockResolvedValueOnce(rows) } as any;
    const svc = new (ReportsService as any)(mockPrisma);
    const res = await svc.getSpendingBySubcategory('user-1', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    } as any);
    expect(res).toHaveLength(1);
    expect(res[0].subcategoryId).toBe('sub-1');
    expect(res[0].amount).toBe('75');
  });

  it('getSpendingByCategoryTags returns unique expense rows (union) with summary', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValueOnce([
        {
          id: 'exp-1',
          user_id: 'user-1',
          category_id: 'cat-1',
          subcategory_id: null,
          amount: '25.00',
          date: '2025-01-15',
          description: 'Coffee',
          source: 'manual',
          status: 'confirmed',
          merchant_name: null,
          created_at: new Date('2025-01-15T01:00:00Z'),
          updated_at: new Date('2025-01-15T01:00:00Z'),
          cat_id: 'cat-1',
          cat_name: 'Food',
          cat_type: 'custom',
          cat_color_code: null,
          cat_icon: null,
          sub_id: null,
          sub_name: null,
          tags: [
            { id: 'tag-1', name: 'Bills', colorCode: '#00ff00' },
            { id: 'tag-2', name: 'Coffee', colorCode: null },
          ],
        },
      ]),
    } as any;

    const svc = new (ReportsService as any)(mockPrisma);
    const res = await svc.getSpendingByCategoryTags('user-1', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      categoryId: 'cat-1',
    } as any);

    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe('exp-1');
    expect(res.data[0].categoryId).toBe('cat-1');
    expect(res.data[0].tags).toHaveLength(2);
    expect(res.summary.count).toBe(1);
    expect(res.summary.totalAmount).toBe(25);
  });

  it('getBudgetVsActual returns budget points per month', async () => {
    const monthlyBudget = [{ monthly_budget: '100.00' }];
    const rows = [{ bucket: new Date('2025-01-01'), actual: '10' }];
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValueOnce(monthlyBudget).mockResolvedValueOnce(rows),
    } as any;
    const svc = new (ReportsService as any)(mockPrisma);
    const res = await svc.getBudgetVsActual('user-1', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    } as any);
    expect(res).toHaveLength(1);
    expect(res[0].budgetAmount).toBe('100.00');
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
    const svc = new (ReportsService as any)(mockPrisma);
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
    const svc = new (ReportsService as any)(mockPrisma);
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
      const svc = new (ReportsService as any)(mockPrisma);
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
      const svc = new (ReportsService as any)(mockPrisma);
      const res = await svc.getSubcategoryBudgetReport('user-1', {
        startDate: '2025-02-01',
      } as any);
      expect(res).toHaveLength(1);
      expect(res[0].period_start).toBeInstanceOf(Date);
      expect(res[0].period_end).toBeInstanceOf(Date);
    });

    it('getBudgetVsActual correctly aggregates monthly budget from budget table', async () => {
      const monthlyBudget = [{ monthly_budget: '200.00' }];
      const rows = [
        { bucket: new Date('2025-01-01'), actual: '75' },
        { bucket: new Date('2025-02-01'), actual: '50' },
      ];
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValueOnce(monthlyBudget).mockResolvedValueOnce(rows),
      } as any;
      const svc = new (ReportsService as any)(mockPrisma);
      const res = await svc.getBudgetVsActual('user-1', {
        startDate: '2025-01-01',
        endDate: '2025-02-28',
      } as any);
      expect(res).toHaveLength(2);
      expect(res[0].budgetAmount).toBe('200.00');
      expect(res[1].budgetAmount).toBe('200.00');
    });
  });
});
