import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpensesService } from '../../src/modules/expenses/expenses.service';
import { Decimal } from '@prisma/client/runtime/client.js';

describe('ExpensesService', () => {
  let mockPrisma: any;
  let mockAttachmentsService: any;
  let svc: ExpensesService;

  beforeEach(() => {
    mockPrisma = {
      expense: {
        create: vi.fn(async ({ data }: any) => ({ id: 'exp-1', ...data })),
        findMany: vi.fn(async () => [{ id: 'exp-1', amount: new Decimal(100) }]),
        count: vi.fn(async () => 1),
        aggregate: vi.fn(async () => ({ _sum: { amount: new Decimal(100) } })),
        findFirst: vi.fn(async () => ({ id: 'exp-1', amount: new Decimal(100) })),
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      },
      category: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(async () => []) },
      subcategory: { findUnique: vi.fn(), findFirst: vi.fn() },
      attachments: {
        findMany: vi.fn(async () => []),
        groupBy: vi.fn(async () => []),
      },
      expenseItem: { groupBy: vi.fn(async () => []) },
      $transaction: vi.fn(async (ops: any[]) =>
        Promise.all(ops.map((op) => (typeof op === 'function' ? op(mockPrisma) : op))),
      ),
    };
    mockAttachmentsService = { listAttachments: vi.fn(async () => []) };
    svc = new ExpensesService(mockPrisma as any, mockAttachmentsService as any);
  });

  it('create should throw on non-positive amount', async () => {
    await expect(
      svc.create('user-1', { categoryId: 'cat-1', amount: 0, date: '2025-01-01' } as any),
    ).rejects.toThrow('Amount must be positive');
  });

  it('create fails when subcategory belongs to different category', async () => {
    // Provide a subcategory that has a different categoryId than provided
    mockPrisma.subcategory.findUnique.mockResolvedValueOnce({ id: 'sub-1', categoryId: 'cat-X' });
    await expect(
      svc.create('user-1', {
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        amount: 10,
        date: '2025-01-01',
      } as any),
    ).rejects.toThrow('Subcategory does not belong to the provided category');
  });

  it('create should succeed with valid payload', async () => {
    const created = await svc.create('user-1', {
      categoryId: 'cat-1',
      amount: 10,
      date: '2025-01-01',
    } as any);
    expect(created).toBeDefined();
  });

  it('calculateTotals returns total, count and optionally budget', async () => {
    // Setup returned expenses array
    mockPrisma.expense.findMany.mockResolvedValueOnce([
      { amount: new Decimal(10) },
      { amount: new Decimal(20) },
    ]);
    mockPrisma.subcategory.findUnique.mockResolvedValueOnce({
      budgetAmount: new Decimal(100),
      budgetPeriod: 'monthly',
    });
    const totals = await svc.calculateTotals('user-1', undefined, 'sub-1');
    expect(totals.count).toBe(2);
    expect(totals.total.toNumber()).toBe(30);
    expect(totals.budgetAmount?.toNumber()).toBe(100);
  });

  it('calculateTotals with category fallback returns category budget', async () => {
    // Setup expenses
    mockPrisma.expense.findMany.mockResolvedValueOnce([
      { amount: new Decimal(10) },
      { amount: new Decimal(20) },
    ]);
    mockPrisma.subcategory.findUnique.mockResolvedValueOnce(null);
    mockPrisma.category.findUnique.mockResolvedValueOnce({
      budgetAmount: new Decimal(200),
      budgetPeriod: 'annual',
    });
    const totals = await svc.calculateTotals('user-1', 'cat-1', undefined);
    expect(totals.budgetAmount?.toNumber()).toBe(200);
  });

  it('findAll returns data with attachment counts and pagination', async () => {
    // Prepare mock expenses and attachments
    const expenseRow = {
      id: 'exp-1',
      amount: new Decimal(10),
      date: new Date('2025-01-01'),
      category: { id: 'cat-1' },
      subcategory: { id: 'sub-1' },
    };
    mockPrisma.expense.findMany.mockResolvedValueOnce([expenseRow]);
    mockPrisma.expense.count.mockResolvedValueOnce(1);
    mockPrisma.expense.aggregate.mockResolvedValueOnce({ _sum: { amount: new Decimal(10) } });
    mockPrisma.attachments.findMany.mockResolvedValueOnce([{ linked_expense_id: 'exp-1' }]);

    const res = await svc.findAll('user-1', { page: 1, pageSize: 20 } as any);
    expect(res.data).toHaveLength(1);
    expect(res.pagination.total).toBe(1);
  });

  it('findAll supports filterYear and filterMonth', async () => {
    const expenseRow = {
      id: 'exp-1',
      amount: new Decimal(10),
      date: new Date('2025-03-01'),
      category: { id: 'cat-1' },
      subcategory: { id: 'sub-1' },
    };
    mockPrisma.expense.findMany.mockResolvedValueOnce([expenseRow]);
    mockPrisma.expense.count.mockResolvedValueOnce(1);
    mockPrisma.expense.aggregate.mockResolvedValueOnce({ _sum: { amount: new Decimal(10) } });
    mockPrisma.attachments.findMany.mockResolvedValueOnce([{ linked_expense_id: 'exp-1' }]);
    const res = await svc.findAll('user-1', { filterYear: 2025, filterMonth: 3 } as any);
    expect(res.data[0]).toBeDefined();
  });

  it('findOne returns Attachment list included', async () => {
    mockPrisma.expense.findFirst.mockResolvedValueOnce({
      id: 'exp-1',
      amount: new Decimal(15),
      date: new Date('2025-01-01'),
      category: null,
      subcategory: null,
    });
    mockAttachmentsService.listAttachments.mockResolvedValueOnce([{ id: 'att-1' }]);
    const res = await svc.findOne('user-1', 'exp-1');
    expect(res).toBeDefined();
    expect((res as any).attachments).toHaveLength(1);
  });

  it('update modifies and returns updated expense', async () => {
    mockPrisma.expense.findFirst.mockResolvedValueOnce({
      id: 'exp-1',
      amount: new Decimal(100),
      date: new Date('2025-01-01'),
      category: null,
      subcategory: null,
    });
    mockPrisma.expense.update.mockResolvedValueOnce({
      id: 'exp-1',
      amount: new Decimal(200),
      date: new Date('2025-01-01'),
    });
    const res = await svc.update('user-1', 'exp-1', { amount: 200 } as any);
    expect(res).toBeDefined();
  });

  it('remove calls soft delete and uses findOne to assert existence', async () => {
    mockPrisma.expense.findFirst.mockResolvedValueOnce({
      id: 'exp-1',
      amount: new Decimal(100),
      date: new Date('2025-01-01'),
    });
    mockPrisma.expense.update.mockResolvedValueOnce({ id: 'exp-1', deletedAt: new Date() });
    await svc.remove('user-1', 'exp-1');
    expect(mockPrisma.expense.update).toHaveBeenCalled();
  });

  it('create recurring uses transaction to create multiple', async () => {
    const dto = {
      categoryId: 'cat-1',
      amount: 10,
      date: '2025-01-01',
      recurring: true,
      recurrenceFrequency: 'monthly',
      numberOfRecurrences: 3,
    } as any;
    const spyTrans = mockPrisma.$transaction;
    const res = await svc.create('user-1', dto);
    expect(spyTrans).toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it('create recurring with biweekly frequency creates multiple entries', async () => {
    const dto = {
      categoryId: 'cat-1',
      amount: 10,
      date: '2025-01-01',
      recurring: true,
      recurrenceFrequency: 'biweekly',
      numberOfRecurrences: 2,
    } as any;
    const res = await svc.create('user-1', dto);
    expect(res).toBeDefined();
  });

  it('create recurring with weekly frequency creates entries', async () => {
    const dto = {
      categoryId: 'cat-1',
      amount: 10,
      date: '2025-01-01',
      recurring: true,
      recurrenceFrequency: 'weekly',
      numberOfRecurrences: 1,
    } as any;
    const res = await svc.create('user-1', dto);
    expect(res).toBeDefined();
  });

  it('bulkCreate creates item, handles duplicates and failures', async () => {
    // Success path - return a category with subcategories included
    mockPrisma.category.findMany.mockResolvedValueOnce([
      { id: 'cat-1', name: 'Utilities', subcategories: [{ id: 'sub-1', name: 'Electric' }] },
    ]);
    mockPrisma.expense.findMany.mockResolvedValueOnce([]); // no duplicates
    mockPrisma.expense.create.mockResolvedValueOnce({
      id: 'e1',
      category: { id: 'cat-1' },
      subcategory: { id: 'sub-1' },
    });
    const out1 = await svc.bulkCreate('user-1', [
      {
        categoryName: 'Utilities',
        subcategoryName: 'Electric',
        amount: 10,
        date: '2025-01-01',
      } as any,
    ]);
    expect(out1.created.length).toBe(1);

    // Duplicate path
    mockPrisma.category.findMany.mockResolvedValueOnce([
      { id: 'cat-1', name: 'Utilities', subcategories: [{ id: 'sub-1', name: 'Electric' }] },
    ]);
    mockPrisma.expense.findMany.mockResolvedValueOnce([
      { amount: new Decimal(10), date: new Date('2025-01-02'), description: null },
    ]);
    const out2 = await svc.bulkCreate('user-1', [
      {
        categoryName: 'Utilities',
        subcategoryName: 'Electric',
        amount: 10,
        date: '2025-01-02',
      } as any,
    ]);
    expect(out2.duplicates.length).toBe(1);

    // Failure path - missing category
    mockPrisma.category.findMany.mockResolvedValueOnce([]);
    mockPrisma.expense.findMany.mockResolvedValueOnce([]);
    const out3 = await svc.bulkCreate('user-1', [
      { categoryName: 'Unknown', amount: 10, date: '2025-01-03' } as any,
    ]);
    expect(out3.failed.length).toBe(1);
  });
});
