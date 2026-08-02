import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { ErrorDetail } from './dto/import-session-response.dto';
import AdmZip from 'adm-zip';
import {
  upsertCategoryBudget,
  upsertSubcategoryBudget,
  computeBudgetDateRange,
} from '../../common/budgets';

interface ParsedRow {
  date: string;
  amount: string;
  category: string;
  description?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: { date: Date; amount: number; categoryId: string; description?: string };
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string, fileName: string, fileType: 'xlsx' | 'csv') {
    return this.prisma.importSession.create({
      data: { userId, fileName, fileType, status: 'processing' },
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.importSession.findUnique({ where: { id: sessionId } });
  }

  async parseCSV(buffer: Buffer): Promise<ParsedRow[]> {
    const rows: ParsedRow[] = [];
    const stream = Readable.from(buffer);

    return new Promise((resolve, reject) => {
      stream
        .pipe(csvParser({ mapHeaders: ({ header }) => header.toLowerCase().trim() }))
        .on('data', (row) => {
          rows.push({
            date: row.date || '',
            amount: row.amount || '',
            category: row.category || '',
            description: row.description || '',
          });
        })
        .on('end', () => resolve(rows))
        .on('error', (error) => reject(error));
    });
  }

  async parseExcel(buffer: Buffer): Promise<ParsedRow[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false });

    return data.map((row: any) => ({
      date: row.Date || row.date || '',
      amount: row.Amount || row.amount || '',
      category: row.Category || row.category || '',
      description: row.Description || row.description || '',
    }));
  }

  async validateRow(row: ParsedRow, userId: string): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate amount
    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Amount must be a positive number');
    }

    // Validate date
    const date = this.parseDate(row.date);
    if (!date || isNaN(date.getTime())) {
      errors.push('Invalid date format (expected MM/DD/YYYY or YYYY-MM-DD)');
    }

    // Validate category exists
    let categoryId: string | null = null;
    if (row.category) {
      const category = await this.prisma.category.findFirst({
        where: {
          name: { equals: row.category, mode: 'insensitive' },
          OR: [{ type: 'predefined' }, { userId }],
          deletedAt: null,
        },
      });

      if (!category) {
        errors.push(`Category "${row.category}" not found`);
      } else {
        categoryId = category.id;
      }
    } else {
      errors.push('Category is required');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      data: {
        date: date!,
        amount,
        categoryId: categoryId!,
        description: row.description || undefined,
      },
    };
  }

  private parseDate(dateStr: string): Date | null {
    // Try MM/DD/YYYY format
    const mdyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const mdyMatch = dateStr.match(mdyRegex);
    if (mdyMatch) {
      const [, month, day, year] = mdyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try YYYY-MM-DD format
    const ymdRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const ymdMatch = dateStr.match(ymdRegex);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try ISO format
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    return null;
  }

  /**
   * Build a lookup key for duplicate expense detection (same user, amount, date, description).
   * An escape-sequence sentinel is used for `null` descriptions so it never collides with an
   * empty-string description.
   */
  private duplicateKey(amount: number, date: Date, description: string | null): string {
    const NULL_SENTINEL = '￿';
    return `${amount}|${date.getTime()}|${description === null ? NULL_SENTINEL : description}`;
  }

  async processImport(sessionId: string, userId: string, rows: ParsedRow[]) {
    this.logger.log(`Processing import session ${sessionId} with ${rows.length} rows`);

    const errorDetails: ErrorDetail[] = [];
    const validExpenses: Prisma.ExpenseCreateManyInput[] = [];

    // Validate all rows
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +2 because row 1 is header, and index starts at 0
      const validation = await this.validateRow(rows[i], userId);

      if (!validation.valid) {
        errorDetails.push({ row: rowNumber, errors: validation.errors });
      } else {
        validExpenses.push({
          userId,
          categoryId: validation.data!.categoryId,
          amount: new Prisma.Decimal(validation.data!.amount),
          date: validation.data!.date,
          description: validation.data!.description,
          source: 'imported',
          status: 'confirmed',
          importSessionId: sessionId,
        });
      }
    }

    // Batch insert valid expenses (1000 at a time)
    const batchSize = 1000;
    let successfulRows = 0;

    for (let i = 0; i < validExpenses.length; i += batchSize) {
      const batch = validExpenses.slice(i, i + batchSize);
      const result = await this.prisma.expense.createMany({ data: batch, skipDuplicates: true });
      successfulRows += result.count;
    }

    // Update session with results
    await this.prisma.importSession.update({
      where: { id: sessionId },
      data: {
        totalRows: rows.length,
        successfulRows,
        failedRows: errorDetails.length,
        errorDetails: errorDetails.length > 0 ? (errorDetails as any) : null,
        status: errorDetails.length === rows.length ? 'failed' : 'completed',
      },
    });

    this.logger.log(
      `Import session ${sessionId} completed: ${successfulRows} successful, ${errorDetails.length} failed`,
    );

    return this.getSession(sessionId);
  }

  /**
   * Import a full dataset from a ZIP containing categories.csv, subcategories.csv, expenses.csv
   */
  async importFullFromZip(buffer: Buffer, userId: string) {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const getText = (name: string) => {
      const entry = entries.find((e) => e.entryName.toLowerCase() === name.toLowerCase());
      return entry ? entry.getData().toString('utf8') : null;
    };

    const categoriesCsv = getText('categories.csv');
    const subcategoriesCsv = getText('subcategories.csv');
    const expensesCsv = getText('expenses.csv');

    const parseCsvText = async (text: string): Promise<any[]> => {
      const rows: any[] = [];
      const stream = Readable.from(Buffer.from(text, 'utf8'));
      return new Promise((resolve, reject) => {
        stream
          .pipe(csvParser({ mapHeaders: ({ header }) => header.toLowerCase().trim() }))
          .on('data', (row) => rows.push(row))
          .on('end', () => resolve(rows))
          .on('error', (err) => reject(err));
      });
    };

    const summary = {
      categoriesCreated: 0,
      categoriesUpdated: 0,
      subcategoriesUpserted: 0,
      expensesCreated: 0,
    };

    // Categories (custom only) — pre-fetch existing rows once instead of a findFirst per row
    if (categoriesCsv) {
      const rows = await parseCsvText(categoriesCsv);

      const existingCategories = await this.prisma.category.findMany({
        where: { userId, type: 'custom' },
      });
      const existingByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));

      // Dedupe by name so a repeated name in the CSV keeps only the last row's data
      // (matches the original row-by-row upsert's "last write wins" behavior). Budget
      // amount/period are tracked separately since they live in the Budget table, not on
      // Category itself.
      const pendingByName = new Map<
        string,
        { data: any; budget: { amount: Prisma.Decimal; period: string | null } | null }
      >();
      for (const r of rows) {
        const name = (r.name || '').trim();
        if (!name) continue;
        const type = (r.type || '').toLowerCase();
        // Only handle custom categories for the user; predefined are global and seeded
        if (type && type !== 'custom') continue;

        pendingByName.set(name.toLowerCase(), {
          data: {
            name,
            type: 'custom',
            userId,
            colorCode: r.color_code || null,
            icon: r.icon || null,
          },
          budget: r.budget_amount
            ? { amount: new Prisma.Decimal(r.budget_amount), period: r.budget_period || null }
            : null,
        });
      }

      // Category id per dedupe key, used below to attach budgets via the Budget model.
      const categoryIdByKey = new Map<string, string>();
      const creates: { key: string; data: any }[] = [];
      const updates: { id: string; data: any }[] = [];
      for (const [key, entry] of pendingByName) {
        const existing = existingByName.get(key);
        if (existing) {
          categoryIdByKey.set(key, existing.id);
          updates.push({ id: existing.id, data: entry.data });
        } else {
          creates.push({ key, data: entry.data });
        }
      }

      if (creates.length > 0) {
        const createdCategories = await this.prisma.$transaction(
          creates.map((c) => this.prisma.category.create({ data: c.data })),
        );
        createdCategories.forEach((cat, i) => categoryIdByKey.set(creates[i].key, cat.id));
        summary.categoriesCreated += creates.length;
      }
      if (updates.length > 0) {
        await this.prisma.$transaction(
          updates.map((u) => this.prisma.category.update({ where: { id: u.id }, data: u.data })),
        );
        summary.categoriesUpdated += updates.length;
      }

      for (const [key, entry] of pendingByName) {
        if (!entry.budget) continue;
        const categoryId = categoryIdByKey.get(key);
        if (!categoryId) continue;
        const period =
          entry.budget.period === 'monthly' || entry.budget.period === 'annual'
            ? entry.budget.period
            : undefined;
        const { startDate, endDate } = computeBudgetDateRange(period);
        await upsertCategoryBudget(
          this.prisma,
          categoryId,
          userId,
          entry.budget.amount,
          startDate,
          endDate,
        );
      }
    }

    // Categories (with their subcategories) visible to the user, fetched once and reused by
    // both the subcategories and expenses sections below instead of a findFirst per row.
    let categoriesWithSubs: Array<{
      id: string;
      name: string;
      subcategories: { id: string; name: string }[];
    }> = [];
    if (subcategoriesCsv || expensesCsv) {
      categoriesWithSubs = await this.prisma.category.findMany({
        where: { OR: [{ userId }, { type: 'predefined' }] },
        include: { subcategories: true },
      });
    }
    const categoryByName = new Map(categoriesWithSubs.map((c) => [c.name.toLowerCase(), c]));

    // Subcategory id lookup, seeded from the pre-fetch above and kept in sync as rows below are
    // created/updated, so the expenses section (further down) can resolve subcategories that
    // were just created from subcategories.csv in this same import.
    const subcategoryIdByKey = new Map<string, string>();
    for (const c of categoriesWithSubs) {
      for (const s of c.subcategories) {
        subcategoryIdByKey.set(`${c.id}|${s.name.toLowerCase()}`, s.id);
      }
    }

    // Subcategories
    if (subcategoriesCsv) {
      const rows = await parseCsvText(subcategoriesCsv);

      // Dedupe by category+name (last write wins), same rationale as categories above. Budget
      // amount/period are tracked separately since they live in the Budget table, not on
      // Subcategory itself.
      const pendingByKey = new Map<
        string,
        { data: any; budget: { amount: Prisma.Decimal; period: string | null } | null }
      >();
      for (const r of rows) {
        const categoryName = (r.category || '').trim();
        const name = (r.name || '').trim();
        if (!name || !categoryName) continue;

        const category = categoryByName.get(categoryName.toLowerCase());
        if (!category) continue;

        pendingByKey.set(`${category.id}|${name.toLowerCase()}`, {
          data: { name, categoryId: category.id },
          budget: r.budget_amount
            ? { amount: new Prisma.Decimal(r.budget_amount), period: r.budget_period || null }
            : null,
        });
      }

      const creates: { key: string; data: any }[] = [];
      const updates: { id: string; data: any }[] = [];
      for (const [key, entry] of pendingByKey) {
        const existingId = subcategoryIdByKey.get(key);
        if (existingId) {
          updates.push({ id: existingId, data: entry.data });
        } else {
          creates.push({ key, data: entry.data });
        }
      }

      if (creates.length > 0) {
        const createdSubcategories = await this.prisma.$transaction(
          creates.map((c) => this.prisma.subcategory.create({ data: c.data })),
        );
        for (const sub of createdSubcategories) {
          subcategoryIdByKey.set(`${sub.categoryId}|${sub.name.toLowerCase()}`, sub.id);
        }
      }
      if (updates.length > 0) {
        await this.prisma.$transaction(
          updates.map((u) => this.prisma.subcategory.update({ where: { id: u.id }, data: u.data })),
        );
      }
      summary.subcategoriesUpserted += pendingByKey.size;

      for (const [key, entry] of pendingByKey) {
        if (!entry.budget) continue;
        const subcategoryId = subcategoryIdByKey.get(key);
        if (!subcategoryId) continue;
        const period =
          entry.budget.period === 'monthly' || entry.budget.period === 'annual'
            ? entry.budget.period
            : undefined;
        const { startDate, endDate } = computeBudgetDateRange(period);
        await upsertSubcategoryBudget(
          this.prisma,
          subcategoryId,
          userId,
          entry.budget.amount,
          startDate,
          endDate,
        );
      }
    }

    // Expenses
    if (expensesCsv) {
      const rows = await parseCsvText(expensesCsv);

      // Pre-fetch this user's expenses once for O(1) in-memory duplicate detection instead of
      // a findFirst per row. Deliberately not filtering deletedAt to match prior behavior.
      const existingExpenses = await this.prisma.expense.findMany({
        where: { userId },
        select: { amount: true, date: true, description: true },
      });
      const seenKeys = new Set(
        existingExpenses.map((e) => this.duplicateKey(e.amount.toNumber(), e.date, e.description)),
      );

      const creates: Prisma.ExpenseCreateManyInput[] = [];
      for (const r of rows) {
        const amount = parseFloat(r.amount);
        const date = this.parseDate(r.date || '');
        const categoryName = (r.category || '').trim();
        const subcategoryName = (r.subcategory || '').trim();
        const description = (r.description || '').trim();
        if (!amount || !date || !categoryName) continue;

        const category = categoryByName.get(categoryName.toLowerCase());
        if (!category) continue;

        let subcategoryId: string | undefined;
        if (subcategoryName) {
          subcategoryId = subcategoryIdByKey.get(`${category.id}|${subcategoryName.toLowerCase()}`);
        }

        const key = this.duplicateKey(amount, date, description);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        creates.push({
          userId,
          categoryId: category.id,
          subcategoryId: subcategoryId ?? null,
          amount: new Prisma.Decimal(amount),
          date,
          description: description || null,
          source: 'imported',
          status: (r.status as any) || 'confirmed',
          merchantName: r.merchant_name || null,
        });
      }

      const batchSize = 1000;
      for (let i = 0; i < creates.length; i += batchSize) {
        const batch = creates.slice(i, i + batchSize);
        const result = await this.prisma.expense.createMany({ data: batch });
        summary.expensesCreated += result.count;
      }
    }

    return summary;
  }
}
