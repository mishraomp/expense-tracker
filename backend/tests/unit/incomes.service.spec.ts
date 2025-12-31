import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncomesService } from '../../src/modules/incomes/incomes.service';
import { Decimal } from '@prisma/client/runtime/client.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('IncomesService', () => {
  let mockPrisma: any;
  let mockAttachmentsService: any;
  let svc: IncomesService;

  beforeEach(() => {
    mockPrisma = {
      income: {
        create: vi.fn(async ({ data }: any) => ({
          id: 'inc-1',
          ...data,
          amount: new Decimal(data.amount ?? 100),
        })),
        createMany: vi.fn(async () => ({ count: 3 })),
        findMany: vi.fn(async () => [{ id: 'inc-1', amount: new Decimal(100) }]),
        findFirst: vi.fn(async () => ({ id: 'inc-1', amount: new Decimal(100) })),
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
        count: vi.fn(async () => 1),
      },
      attachments: {
        findMany: vi.fn(async () => [{ linked_income_id: 'inc-1' }]),
        count: vi.fn(async () => 1),
      },
      $transaction: vi.fn(async (ops: any[]) =>
        Promise.all(ops.map((op) => (typeof op === 'function' ? op(mockPrisma) : op))),
      ),
    };
    mockAttachmentsService = { listAttachments: vi.fn(async () => [{ id: 'att-1' }]) };
    svc = new IncomesService(mockPrisma as any, mockAttachmentsService as any);
  });

  it('create non-recurring returns the created income', async () => {
    const dto: any = { amount: 100, date: '2025-01-01' };
    const res = await svc.create('user-1', dto);
    expect(res).toBeDefined();
    expect(mockPrisma.income.create).toHaveBeenCalled();
  });

  it('create recurring triggers createMany with numberOfRecurrences', async () => {
    const dto: any = {
      amount: 100,
      date: '2025-01-01',
      isRecurring: true,
      numberOfRecurrences: 2,
      frequency: 'monthly',
    };
    const spyCreateMany = vi.spyOn(mockPrisma.income, 'createMany');
    const res = await svc.create('user-1', dto);
    expect(spyCreateMany).toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it('create recurring with no numberOfRecurrences rolls forward to year boundary', async () => {
    const dto: any = { amount: 100, date: '2025-01-01', isRecurring: true, frequency: 'monthly' };
    // createMany is used in the branch without numberOfRecurrences
    mockPrisma.income.createMany.mockResolvedValueOnce({ count: 12 });
    const res = await svc.create('user-1', dto);
    expect(res).toBeDefined();
    expect(mockPrisma.income.createMany).toHaveBeenCalled();
  });

  it('findAll with startDate/endDate applies range filters', async () => {
    mockPrisma.income.findMany.mockResolvedValueOnce([
      { id: 'inc-1', amount: new Decimal(100), date: new Date('2025-01-01') },
    ]);
    mockPrisma.attachments.findMany.mockResolvedValueOnce([{ linked_income_id: 'inc-1' }]);
    const res = await svc.findAll('user-1', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    } as any);
    expect(res).toHaveLength(1);
  });

  it('findAll includes attachments count mapping', async () => {
    mockPrisma.income.findMany.mockResolvedValueOnce([
      { id: 'inc-1', amount: new Decimal(100), date: new Date('2025-01-01') },
    ]);
    mockPrisma.attachments.findMany.mockResolvedValueOnce([{ linked_income_id: 'inc-1' }]);
    const res = await svc.findAll('user-1', {} as any);
    expect(res).toHaveLength(1);
    expect((res[0] as any).attachmentCount).toBeDefined();
  });

  it('findAll with year applies year boundary filters', async () => {
    mockPrisma.income.findMany.mockResolvedValueOnce([
      { id: 'inc-1', amount: new Decimal(100), date: new Date('2025-01-01') },
    ]);
    mockPrisma.attachments.findMany.mockResolvedValueOnce([{ linked_income_id: 'inc-1' }]);

    await svc.findAll('user-1', { year: 2025 } as any);

    expect(mockPrisma.income.findMany).toHaveBeenCalled();
    const args = mockPrisma.income.findMany.mock.calls[0][0];
    expect(args.where.date.gte).toEqual(new Date(Date.UTC(2025, 0, 1)));
    expect(args.where.date.lt).toEqual(new Date(Date.UTC(2026, 0, 1)));
  });

  it('findAll with year+month applies month boundary filters', async () => {
    mockPrisma.income.findMany.mockResolvedValueOnce([
      { id: 'inc-1', amount: new Decimal(100), date: new Date('2025-02-01') },
    ]);
    mockPrisma.attachments.findMany.mockResolvedValueOnce([{ linked_income_id: 'inc-1' }]);

    await svc.findAll('user-1', { year: 2025, month: 2 } as any);

    const args = mockPrisma.income.findMany.mock.calls[0][0];
    expect(args.where.date.gte).toEqual(new Date(Date.UTC(2025, 1, 1)));
    expect(args.where.date.lt).toEqual(new Date(Date.UTC(2025, 2, 1)));
  });

  it('findAll with month but no year throws', async () => {
    await expect(svc.findAll('user-1', { month: 1 } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('findOne throws if not found', async () => {
    mockPrisma.income.findFirst.mockResolvedValueOnce(null);
    await expect(svc.findOne('user-1', 'inc-xyz')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findOne returns attachments', async () => {
    mockPrisma.income.findFirst.mockResolvedValueOnce({
      id: 'inc-1',
      amount: new Decimal(100),
      date: new Date('2025-01-01'),
    });
    mockAttachmentsService.listAttachments.mockResolvedValueOnce([{ id: 'att-1' }]);
    const res = await svc.findOne('user-1', 'inc-1');
    expect((res as any).attachments).toBeDefined();
  });

  it('update throws if not found', async () => {
    mockPrisma.income.findFirst.mockResolvedValueOnce(null);
    await expect(svc.update('user-1', 'inc-xyz', { amount: 200 } as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove throws if not found', async () => {
    mockPrisma.income.findFirst.mockResolvedValueOnce(null);
    await expect(svc.remove('user-1', 'inc-xyz')).rejects.toBeInstanceOf(NotFoundException);
  });
});
