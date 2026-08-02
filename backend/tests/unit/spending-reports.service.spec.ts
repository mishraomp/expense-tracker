import { describe, it, expect, vi } from 'vitest';
import { SpendingReportsService } from '../../src/modules/reports/spending-reports.service';

describe('SpendingReportsService', () => {
  it('getSpendingOverTime maps rows to response dto', async () => {
    const mockRows = [{ bucket: new Date('2025-01-01'), amount: '123.45' }];
    const mockPrisma = { $queryRaw: vi.fn().mockResolvedValue(mockRows) } as any;
    const svc = new SpendingReportsService(mockPrisma);

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

  it('getSpendingByCategory returns mapped categories', async () => {
    const rows = [{ id: 'cat-1', name: 'Cat 1', color_code: 'red', amount: '250' }];
    const mockPrisma = { $queryRaw: vi.fn().mockResolvedValueOnce(rows) } as any;
    const svc = new (SpendingReportsService as any)(mockPrisma);
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
    const svc = new (SpendingReportsService as any)(mockPrisma);
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

    const svc = new (SpendingReportsService as any)(mockPrisma);
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
});
