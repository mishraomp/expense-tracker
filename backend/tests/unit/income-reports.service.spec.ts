import { describe, it, expect, vi } from 'vitest';
import { IncomeReportsService } from '../../src/modules/reports/income-reports.service';

describe('IncomeReportsService', () => {
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
    const svc = new IncomeReportsService(mockPrisma);

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
});
