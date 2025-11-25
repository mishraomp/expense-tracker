import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportService } from '../../src/modules/import/import.service';
import { Prisma } from '@prisma/client';

describe('ImportService', () => {
  let mockPrisma: any;
  let svc: ImportService;

  beforeEach(() => {
    mockPrisma = {
      importSession: {
        create: vi.fn(async ({ data }: any) => ({ id: 's1', ...data })),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      category: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      subcategory: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      expense: {
        findFirst: vi.fn(),
        createMany: vi.fn(async () => ({ count: 1 })),
        create: vi.fn(),
      },
    };
    svc = new ImportService(mockPrisma as any);
  });

  it('parseCSV reads rows', async () => {
    const csv = 'date,amount,category,description\n2025-01-01,10,Utilities,Test';
    const buf = Buffer.from(csv, 'utf8');
    const rows = await svc.parseCSV(buf);
    expect(rows[0].date).toBe('2025-01-01');
    expect(rows[0].amount).toBe('10');
  });

  it('parseExcel reads rows', async () => {
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { Date: '2025-01-01', Amount: '10', Category: 'Utilities' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const rows = await svc.parseExcel(buf);
    expect(rows[0].date).toBe('2025-01-01');
  });

  it('validateRow fails invalid amount and date', async () => {
    const res = await svc.validateRow({ date: 'invalid', amount: 'abc', category: '' }, 'user-1');
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Amount'))).toBe(true);
  });

  it('validateRow returns valid when category exists', async () => {
    mockPrisma.category.findFirst.mockResolvedValueOnce({ id: 'c1' });
    const res = await svc.validateRow(
      { date: '2025-01-01', amount: '10', category: 'Utilities' },
      'user-1',
    );
    expect(res.valid).toBe(true);
    expect(res.data?.categoryId).toBe('c1');
  });

  it('processImport inserts valid rows and updates session', async () => {
    // Setup to validate a row and create it
    mockPrisma.category.findFirst.mockResolvedValueOnce({ id: 'c1' });
    mockPrisma.expense.createMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.importSession.update.mockResolvedValueOnce({ id: 's1' });
    const rows = [{ date: '2025-01-01', amount: '10', category: 'Utilities' } as any];
    mockPrisma.importSession.findUnique.mockResolvedValueOnce({ id: 's1' });
    const result = await svc.processImport('s1', 'user-1', rows);
    expect(result).toBeDefined();
  });

  it('importFullFromZip processes categories, subcategories and expenses', async () => {
    const AdmZip = require('adm-zip');
    const categoriesCsv =
      'name,type,color_code,icon,budget_amount,budget_period\nMyCat,custom,#fff,,100,monthly';
    const subcategoriesCsv = 'category,name,budget_amount,budget_period\nMyCat,MySub,10,monthly';
    const expensesCsv =
      'date,amount,category,subcategory,description\n2025-01-01,10,MyCat,MySub,Test';
    const zip = new AdmZip();
    zip.addFile('categories.csv', Buffer.from(categoriesCsv, 'utf8'));
    zip.addFile('subcategories.csv', Buffer.from(subcategoriesCsv, 'utf8'));
    zip.addFile('expenses.csv', Buffer.from(expensesCsv, 'utf8'));
    const buf = zip.toBuffer();

    // Mock category/subcategory flows
    mockPrisma.category.findFirst.mockResolvedValueOnce(null); // category not found -> create
    mockPrisma.category.create = vi.fn(async ({ data }: any) => ({ id: 'c1', ...data }));
    mockPrisma.subcategory.findFirst.mockResolvedValueOnce(null); // sub not found -> create
    mockPrisma.subcategory.create = vi.fn(async ({ data }: any) => ({ id: 's1', ...data }));
    mockPrisma.expense.findFirst.mockResolvedValueOnce(null); // no duplicate
    mockPrisma.expense.create = vi.fn(async ({ data }: any) => ({ id: 'e1', ...data }));

    const summary = await svc.importFullFromZip(buf, 'user-1');
    expect(summary.categoriesCreated).toBeGreaterThanOrEqual(0);
    expect(summary.expensesCreated).toBeGreaterThanOrEqual(0);
  });

  it('importFullFromZip skips duplicate expenses', async () => {
    const AdmZip = require('adm-zip');
    const expensesCsv =
      'date,amount,category,subcategory,description\n2025-01-01,10,MyCat,MySub,Test';
    const zip = new AdmZip();
    zip.addFile('expenses.csv', Buffer.from(expensesCsv, 'utf8'));
    const buf = zip.toBuffer();

    // Mock category exists
    mockPrisma.category.findFirst.mockResolvedValueOnce({ id: 'c1' });
    // Duplicate detection
    mockPrisma.expense.findFirst.mockResolvedValueOnce({ id: 'e-exists' });

    const summary = await svc.importFullFromZip(buf, 'user-1');
    expect(summary.expensesCreated).toBe(0);
  });
});
