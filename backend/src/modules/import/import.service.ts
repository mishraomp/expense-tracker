import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { ErrorDetail } from './dto/import-session-response.dto';
import AdmZip from 'adm-zip';

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
   * Check if a similar expense already exists
   * (same user, amount, date, and description)
   */
  private async checkForDuplicate(
    userId: string,
    data: { amount: number; date: Date; description: string },
  ): Promise<boolean> {
    const existing = await this.prisma.expense.findFirst({
      where: {
        userId,
        amount: new Prisma.Decimal(data.amount),
        date: data.date,
        description: data.description,
      },
    });

    return !!existing;
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

    // Categories (custom only)
    if (categoriesCsv) {
      const rows = await parseCsvText(categoriesCsv);
      for (const r of rows) {
        const name = (r.name || '').trim();
        if (!name) continue;
        const type = (r.type || '').toLowerCase();
        // Only handle custom categories for the user; predefined are global and seeded
        if (type && type !== 'custom') continue;

        const existing = await this.prisma.category.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, userId },
        });
        const data: any = {
          name,
          type: 'custom',
          userId,
          colorCode: r.color_code || null,
          icon: r.icon || null,
          budgetAmount: r.budget_amount ? new Prisma.Decimal(r.budget_amount) : null,
          budgetPeriod: r.budget_period || null,
        };
        if (existing) {
          await this.prisma.category.update({ where: { id: existing.id }, data });
          summary.categoriesUpdated++;
        } else {
          await this.prisma.category.create({ data });
          summary.categoriesCreated++;
        }
      }
    }

    // Subcategories
    if (subcategoriesCsv) {
      const rows = await parseCsvText(subcategoriesCsv);
      for (const r of rows) {
        const categoryName = (r.category || '').trim();
        const name = (r.name || '').trim();
        if (!name || !categoryName) continue;

        const category = await this.prisma.category.findFirst({
          where: {
            name: { equals: categoryName, mode: 'insensitive' },
            OR: [{ userId }, { type: 'predefined' }],
          },
        });
        if (!category) continue;

        const existing = await this.prisma.subcategory.findFirst({
          where: { categoryId: category.id, name: { equals: name, mode: 'insensitive' } },
        });
        const data: any = {
          name,
          categoryId: category.id,
          budgetAmount: r.budget_amount ? new Prisma.Decimal(r.budget_amount) : null,
          budgetPeriod: r.budget_period || null,
        };
        if (existing) {
          await this.prisma.subcategory.update({ where: { id: existing.id }, data });
        } else {
          await this.prisma.subcategory.create({ data });
        }
        summary.subcategoriesUpserted++;
      }
    }

    // Expenses
    if (expensesCsv) {
      const rows = await parseCsvText(expensesCsv);
      for (const r of rows) {
        const amount = parseFloat(r.amount);
        const date = this.parseDate(r.date || '');
        const categoryName = (r.category || '').trim();
        const subcategoryName = (r.subcategory || '').trim();
        const description = (r.description || '').trim();
        if (!amount || !date || !categoryName) continue;

        const category = await this.prisma.category.findFirst({
          where: {
            name: { equals: categoryName, mode: 'insensitive' },
            OR: [{ userId }, { type: 'predefined' }],
          },
        });
        if (!category) continue;

        let subcategoryId: string | undefined = undefined;
        if (subcategoryName) {
          const sub = await this.prisma.subcategory.findFirst({
            where: {
              categoryId: category.id,
              name: { equals: subcategoryName, mode: 'insensitive' },
            },
          });
          if (sub) subcategoryId = sub.id;
        }

        const duplicate = await this.checkForDuplicate(userId, {
          amount,
          date,
          description,
        });
        if (duplicate) continue;

        await this.prisma.expense.create({
          data: {
            userId,
            categoryId: category.id,
            subcategoryId: subcategoryId ?? null,
            amount: new Prisma.Decimal(amount),
            date,
            description: description || null,
            source: 'imported',
            status: (r.status as any) || 'confirmed',
            merchantName: r.merchant_name || null,
          },
        });
        summary.expensesCreated++;
      }
    }

    return summary;
  }
}
