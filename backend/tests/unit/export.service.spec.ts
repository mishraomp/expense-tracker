import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportService } from '../../src/modules/export/export.service';
import AdmZip from 'adm-zip';

describe('ExportService', () => {
  let mockPrisma: any;
  let svc: ExportService;

  beforeEach(() => {
    mockPrisma = {
      category: {
        findMany: vi.fn(async () => [
          { id: 'c1', name: 'Utilities', type: 'custom', colorCode: '#fff' },
        ]),
      },
      subcategory: {
        findMany: vi.fn(async () => [
          { id: 's1', name: 'Electric', category: { name: 'Utilities' } },
        ]),
      },
      expense: {
        findMany: vi.fn(async () => [
          {
            id: 'e1',
            amount: { toString: () => '10' },
            date: new Date('2025-01-01'),
            category: { name: 'Utilities' },
            subcategory: { name: 'Electric' },
            description: 'Test',
            status: 'confirmed',
            source: 'manual',
          },
        ]),
      },
    };
    svc = new ExportService(mockPrisma as any);
  });

  it('generateUserExportZip creates a zip with categories, subcategories and expenses CSV', async () => {
    const buf = await svc.generateUserExportZip('user-1');
    const zip = new AdmZip(buf);
    const entries = zip.getEntries();
    const names = entries.map((e) => e.entryName);
    expect(names).toContain('categories.csv');
    expect(names).toContain('subcategories.csv');
    expect(names).toContain('expenses.csv');

    const expensesEntry = zip.getEntry('expenses.csv');
    const content = expensesEntry?.getData().toString('utf8');
    expect(content).toContain('amount');
    expect(content).toContain('description');
    expect(content).toContain('10');
  });
});
