import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Parser as Json2CsvParser } from 'json2csv';
import AdmZip from 'adm-zip';
import { getCategoryBudgetForDisplay, getSubcategoryBudgetForDisplay } from '../../common/budgets';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  private toCsv<T>(rows: T[], fields: { label: string; value: (row: T) => any }[]): string {
    const parser = new Json2CsvParser({
      fields: fields.map((f) => ({ label: f.label, value: (row: any) => f.value(row) })),
      quote: '"',
      delimiter: ',',
      header: true,
    } as any);
    return parser.parse(rows);
  }

  async generateUserExportZip(userId: string): Promise<Buffer> {
    // Fetch data scoped to user
    const categories = await this.prisma.category.findMany({
      where: { OR: [{ userId }, { type: 'predefined' }], deletedAt: null },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    const subcategories = await this.prisma.subcategory.findMany({
      where: { category: { OR: [{ userId }, { type: 'predefined' }] } },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      include: { category: true },
    });

    const expenses = await this.prisma.expense.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ date: 'asc' }],
      include: { category: true, subcategory: true },
    });

    // Enrich categories with budget data
    const categoriesWithBudgets = await Promise.all(
      categories.map(async (cat) => {
        const budget = await getCategoryBudgetForDisplay(this.prisma, cat.id);
        return { ...cat, budgetAmount: budget.budgetAmount, budgetPeriod: budget.budgetPeriod };
      }),
    );

    // Enrich subcategories with budget data
    const subcategoriesWithBudgets = await Promise.all(
      subcategories.map(async (sub) => {
        const budget = await getSubcategoryBudgetForDisplay(this.prisma, sub.id);
        return { ...sub, budgetAmount: budget.budgetAmount, budgetPeriod: budget.budgetPeriod };
      }),
    );

    // Build CSVs
    const categoriesCsv = this.toCsv(categoriesWithBudgets, [
      { label: 'name', value: (r) => r.name },
      { label: 'type', value: (r) => r.type },
      { label: 'color_code', value: (r) => r.colorCode ?? '' },
      { label: 'icon', value: (r) => r.icon ?? '' },
      { label: 'budget_amount', value: (r) => r.budgetAmount ?? '' },
      { label: 'budget_period', value: (r) => r.budgetPeriod ?? '' },
    ]);

    const subcategoriesCsv = this.toCsv(subcategoriesWithBudgets, [
      { label: 'category', value: (r) => r.category.name },
      { label: 'name', value: (r) => r.name },
      { label: 'budget_amount', value: (r) => r.budgetAmount ?? '' },
      { label: 'budget_period', value: (r) => r.budgetPeriod ?? '' },
    ]);

    const expensesCsv = this.toCsv(expenses, [
      { label: 'date', value: (r) => r.date.toISOString().slice(0, 10) },
      { label: 'amount', value: (r) => r.amount.toString() },
      { label: 'category', value: (r) => r.category?.name ?? '' },
      { label: 'subcategory', value: (r) => r.subcategory?.name ?? '' },
      { label: 'description', value: (r) => r.description ?? '' },
      { label: 'status', value: (r) => r.status },
      { label: 'source', value: (r) => r.source },
      { label: 'merchant_name', value: (r) => r.merchantName ?? '' },
    ]);

    // Package into ZIP
    const zip = new AdmZip();
    zip.addFile('categories.csv', Buffer.from(categoriesCsv, 'utf8'));
    zip.addFile('subcategories.csv', Buffer.from(subcategoriesCsv, 'utf8'));
    zip.addFile('expenses.csv', Buffer.from(expensesCsv, 'utf8'));

    return zip.toBuffer();
  }
}
