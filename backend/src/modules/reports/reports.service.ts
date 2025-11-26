import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  SpendingOverTimeQueryDto,
  SpendingOverTimeResponseDto,
} from './dto/spending-over-time.dto';
import {
  SpendingByCategoryQueryDto,
  CategoryBreakdownItemDto,
} from './dto/spending-by-category.dto';
import { BudgetVsActualPointDto, BudgetVsActualQueryDto } from './dto/budget-vs-actual.dto';
import {
  IncomeVsExpenseQueryDto,
  IncomeVsExpenseResponseDto,
  MonthlyComparisonDto,
} from './dto/income-vs-expense.dto';

/**
 * Response DTO for top expense items report
 */
export interface TopExpenseItemDto {
  name: string;
  totalAmount: string;
  itemCount: number;
  expenseCount: number;
  categoryId: string | null;
  categoryName: string | null;
  colorCode: string | null;
}

/**
 * Response DTO for item search results
 */
export interface ItemSearchResultDto {
  id: string;
  name: string;
  amount: string;
  expenseId: string;
  expenseDate: string;
  expenseDescription: string | null;
  categoryId: string | null;
  categoryName: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  notes: string | null;
}

export interface CategoryBudgetRowDto {
  category_id: string;
  category_name: string;
  category_type: string;
  color_code: string | null;
  icon: string | null;
  user_id: string | null;
  budget_amount: string | null;
  budget_period: 'monthly' | 'annual' | null;
  period_start: Date | null;
  period_end: Date | null;
  total_spent: string;
  percent_used: string | null;
  remaining_budget: string | null;
  is_over_budget: boolean;
  over_budget_amount: string | null;
}

export interface SubcategoryBudgetRowDto {
  subcategory_id: string;
  subcategory_name: string;
  category_id: string;
  category_name: string;
  category_type: string;
  category_color: string | null;
  category_icon: string | null;
  user_id: string | null;
  budget_amount: string | null;
  budget_period: 'monthly' | 'annual' | null;
  period_start: Date | null;
  period_end: Date | null;
  total_spent: string;
  percent_used: string | null;
  remaining_budget: string | null;
  is_over_budget: boolean;
  over_budget_amount: string | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSpendingOverTime(
    userId: string,
    q: SpendingOverTimeQueryDto,
  ): Promise<SpendingOverTimeResponseDto> {
    const { startDate, endDate, interval, categoryId, subcategoryId } = q;

    // Build optional filters
    const filters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
    ];
    if (categoryId) filters.push(Prisma.sql`e."category_id" = ${categoryId}::uuid`);
    if (subcategoryId) filters.push(Prisma.sql`e."subcategory_id" = ${subcategoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')} AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date`;

    const bucketExpr =
      interval === 'day'
        ? Prisma.sql`e."date"`
        : interval === 'week'
          ? Prisma.sql`DATE_TRUNC('week', e."date"::timestamp)::date`
          : Prisma.sql`DATE_TRUNC('month', e."date"::timestamp)::date`;

    const rows: Array<{ bucket: Date; amount: string }> = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT ${bucketExpr} as bucket, COALESCE(SUM(e."amount"), 0)::text as amount
        FROM "expenses" e
        ${where}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
    );

    return {
      data: rows.map((r) => ({ bucket: r.bucket.toISOString().slice(0, 10), amount: r.amount })),
      meta: { interval },
    };
  }

  async getSpendingByCategory(
    userId: string,
    q: SpendingByCategoryQueryDto,
  ): Promise<CategoryBreakdownItemDto[]> {
    const { startDate, endDate, categoryId, subcategoryId } = q;

    const filters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
    ];
    if (categoryId) filters.push(Prisma.sql`e."category_id" = ${categoryId}::uuid`);
    if (subcategoryId) filters.push(Prisma.sql`e."subcategory_id" = ${subcategoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')} AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date`;

    const rows: Array<{ id: string; name: string; color_code: string | null; amount: string }> =
      await this.prisma.$queryRaw(
        Prisma.sql`
        SELECT c."id", c."name", c."color_code", COALESCE(SUM(e."amount"),0)::text as amount
        FROM "expenses" e
        JOIN "categories" c ON c."id" = e."category_id"
        ${where}
        GROUP BY c."id", c."name", c."color_code"
        ORDER BY COALESCE(SUM(e."amount"),0) DESC
      `,
      );

    return rows.map((r) => ({
      categoryId: r.id,
      categoryName: r.name,
      colorCode: r.color_code,
      amount: r.amount,
    }));
  }

  async getSpendingBySubcategory(
    userId: string,
    q: SpendingByCategoryQueryDto,
  ): Promise<
    Array<{
      subcategoryId: string;
      subcategoryName: string;
      categoryId: string;
      categoryName: string;
      colorCode: string | null;
      amount: string;
    }>
  > {
    const { startDate, endDate, categoryId, subcategoryId } = q;

    // Build base filters for expenses
    const baseExpenseFilters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
    ];

    // Build filters for expense items
    const itemFilters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
      Prisma.sql`ei."deleted_at" IS NULL`,
      Prisma.sql`ei."subcategory_id" IS NOT NULL`,
    ];
    if (categoryId) itemFilters.push(Prisma.sql`ei."category_id" = ${categoryId}::uuid`);
    if (subcategoryId) itemFilters.push(Prisma.sql`ei."subcategory_id" = ${subcategoryId}::uuid`);

    const itemWhere = Prisma.sql`WHERE ${Prisma.join(itemFilters, ' AND ')} AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date`;

    // Union: expense items with subcategory + expenses with subcategory that DON'T have items with that subcategory
    const rows: Array<{
      subcategory_id: string;
      subcategory_name: string;
      category_id: string;
      category_name: string;
      color_code: string | null;
      amount: string;
    }> = await this.prisma.$queryRaw(
      Prisma.sql`
        WITH combined_spending AS (
          -- Expense items assigned to subcategories (preferred when present)
          SELECT ei."subcategory_id", ei."amount"
          FROM "expense_items" ei
          JOIN "expenses" e ON e."id" = ei."expense_id"
          ${itemWhere}
          
          UNION ALL
          
          -- Expenses directly assigned to subcategories, but ONLY if they don't have
          -- expense_items with that same subcategory (to avoid double counting)
          SELECT e."subcategory_id", e."amount"
          FROM "expenses" e
          WHERE ${Prisma.join(baseExpenseFilters, ' AND ')}
            AND e."subcategory_id" IS NOT NULL
            ${categoryId ? Prisma.sql`AND e."category_id" = ${categoryId}::uuid` : Prisma.empty}
            ${subcategoryId ? Prisma.sql`AND e."subcategory_id" = ${subcategoryId}::uuid` : Prisma.empty}
            AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date
            AND NOT EXISTS (
              SELECT 1 FROM "expense_items" ei 
              WHERE ei."expense_id" = e."id" 
                AND ei."deleted_at" IS NULL
                AND ei."subcategory_id" = e."subcategory_id"
            )
        )
        SELECT s."id" as subcategory_id, s."name" as subcategory_name,
               c."id" as category_id, c."name" as category_name, c."color_code",
               COALESCE(SUM(cs."amount"),0)::text as amount
        FROM combined_spending cs
        JOIN "subcategories" s ON s."id" = cs."subcategory_id"
        JOIN "categories" c ON c."id" = s."category_id"
        GROUP BY s."id", s."name", c."id", c."name", c."color_code"
        ORDER BY COALESCE(SUM(cs."amount"),0) DESC
      `,
    );

    return rows.map((r) => ({
      subcategoryId: r.subcategory_id,
      subcategoryName: r.subcategory_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      colorCode: r.color_code,
      amount: r.amount,
    }));
  }

  async getBudgetVsActual(
    userId: string,
    q: BudgetVsActualQueryDto,
  ): Promise<BudgetVsActualPointDto[]> {
    const { startDate, endDate, categoryId, subcategoryId } = q;

    // Determine monthly budget according to precedence rules
    // subcategoryId -> that subcategory; categoryId -> sum of subcategories if present else category; none -> sum for all categories following same rule
    const monthlyBudgetRows: Array<{ monthly_budget: string }> = await this.prisma.$queryRaw(
      Prisma.sql`
        WITH cat_scope AS (
          SELECT c."id"
          FROM "categories" c
          WHERE (c."user_id" = ${userId}::uuid OR c."user_id" IS NULL)
            ${categoryId ? Prisma.sql`AND c."id" = ${categoryId}::uuid` : Prisma.empty}
        ),
        sub_budgets AS (
          SELECT 
            CASE WHEN s."budget_period" = 'annual' THEN (s."budget_amount"/12)::numeric
                 ELSE s."budget_amount"::numeric END AS amt
          FROM "subcategories" s
          JOIN cat_scope cs ON cs."id" = s."category_id"
          WHERE s."budget_amount" IS NOT NULL
            ${subcategoryId ? Prisma.sql`AND s."id" = ${subcategoryId}::uuid` : Prisma.empty}
        ),
        cat_budget AS (
          SELECT 
            CASE WHEN c."budget_period" = 'annual' THEN (c."budget_amount"/12)::numeric
                 ELSE c."budget_amount"::numeric END AS amt
          FROM "categories" c
          JOIN cat_scope cs ON cs."id" = c."id"
          WHERE c."budget_amount" IS NOT NULL
        )
        SELECT 
          COALESCE(
            (SELECT NULLIF(SUM(sb.amt),0) FROM sub_budgets sb),
            (SELECT NULLIF(SUM(cb.amt),0) FROM cat_budget cb),
            0
          )::text AS monthly_budget
      `,
    );

    const monthlyBudget = monthlyBudgetRows[0]?.monthly_budget ?? '0';

    const filters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
    ];
    if (categoryId) filters.push(Prisma.sql`e."category_id" = ${categoryId}::uuid`);
    if (subcategoryId) filters.push(Prisma.sql`e."subcategory_id" = ${subcategoryId}::uuid`);

    const rows: Array<{ bucket: Date; actual: string | null }> = await this.prisma.$queryRaw(
      Prisma.sql`
        WITH RECURSIVE months AS (
          SELECT DATE_TRUNC('month', ${startDate}::date)::date AS m_start
          UNION ALL
          SELECT (m_start + INTERVAL '1 month')::date FROM months
          WHERE m_start < DATE_TRUNC('month', ${endDate}::date)::date
        )
        SELECT m.m_start as bucket,
               (
                 SELECT COALESCE(SUM(e."amount"),0)::text
                 FROM "expenses" e
                 WHERE ${Prisma.join(filters, ' AND ')}
                   AND DATE_TRUNC('month', e."date"::timestamp)::date = m.m_start
               ) as actual
        FROM months m
        ORDER BY m.m_start
      `,
    );

    return rows.map((r) => ({
      bucket: r.bucket.toISOString().slice(0, 10),
      budgetAmount: monthlyBudget,
      actualAmount: r.actual ?? '0',
    }));
  }

  // New: Category budget report from DB view
  async getCategoryBudgetReport(
    userId: string,
    params: { startDate?: string; endDate?: string; categoryId?: string },
  ): Promise<CategoryBudgetRowDto[]> {
    const { startDate, endDate, categoryId } = params;

    const filters: Prisma.Sql[] = [
      Prisma.sql`(v."user_id" = ${userId}::uuid OR v."user_id" IS NULL)`,
    ];
    if (startDate)
      filters.push(Prisma.sql`(v."period_end" IS NULL OR v."period_end" >= ${startDate}::date)`);
    if (endDate)
      filters.push(Prisma.sql`(v."period_start" IS NULL OR v."period_start" <= ${endDate}::date)`);
    if (categoryId) filters.push(Prisma.sql`v."category_id" = ${categoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;

    const rows: CategoryBudgetRowDto[] = await this.prisma.$queryRaw(
      Prisma.sql`SELECT 
          v."category_id", v."category_name", v."category_type", v."color_code", v."icon", v."user_id",
          (v."budget_amount")::text as budget_amount,
          v."budget_period", v."period_start", v."period_end",
          (v."total_spent")::text as total_spent,
          CASE WHEN v."percent_used" IS NULL THEN NULL ELSE (v."percent_used")::text END as percent_used,
          CASE WHEN v."remaining_budget" IS NULL THEN NULL ELSE (v."remaining_budget")::text END as remaining_budget,
          v."is_over_budget",
          CASE WHEN v."over_budget_amount" IS NULL THEN NULL ELSE (v."over_budget_amount")::text END as over_budget_amount
        FROM "vw_category_budget_report" v
        ${where}
        ORDER BY v."category_name", v."period_start" NULLS LAST`,
    );

    return rows;
  }

  // New: Subcategory budget report from DB view
  async getSubcategoryBudgetReport(
    userId: string,
    params: { startDate?: string; endDate?: string; categoryId?: string; subcategoryId?: string },
  ): Promise<SubcategoryBudgetRowDto[]> {
    const { startDate, endDate, categoryId, subcategoryId } = params;

    const filters: Prisma.Sql[] = [
      Prisma.sql`(v."user_id" = ${userId}::uuid OR v."user_id" IS NULL)`,
    ];
    if (startDate)
      filters.push(Prisma.sql`(v."period_end" IS NULL OR v."period_end" >= ${startDate}::date)`);
    if (endDate)
      filters.push(Prisma.sql`(v."period_start" IS NULL OR v."period_start" <= ${endDate}::date)`);
    if (categoryId) filters.push(Prisma.sql`v."category_id" = ${categoryId}::uuid`);
    if (subcategoryId) filters.push(Prisma.sql`v."subcategory_id" = ${subcategoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;

    const rows: SubcategoryBudgetRowDto[] = await this.prisma.$queryRaw(
      Prisma.sql`SELECT 
          v."subcategory_id", v."subcategory_name", v."category_id", v."category_name", v."category_type",
          v."category_color", v."category_icon", v."user_id",
          (v."budget_amount")::text as budget_amount,
          v."budget_period", v."period_start", v."period_end",
          (v."total_spent")::text as total_spent,
          CASE WHEN v."percent_used" IS NULL THEN NULL ELSE (v."percent_used")::text END as percent_used,
          CASE WHEN v."remaining_budget" IS NULL THEN NULL ELSE (v."remaining_budget")::text END as remaining_budget,
          v."is_over_budget",
          CASE WHEN v."over_budget_amount" IS NULL THEN NULL ELSE (v."over_budget_amount")::text END as over_budget_amount
        FROM "vw_subcategory_budget_report" v
        ${where}
        ORDER BY v."category_name", v."subcategory_name", v."period_start" NULLS LAST`,
    );

    return rows;
  }

  async getIncomeVsExpense(
    userId: string,
    query: IncomeVsExpenseQueryDto,
  ): Promise<IncomeVsExpenseResponseDto> {
    const { startDate, endDate } = query;

    // Get total income
    const incomeResult = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(amount), 0)::text as total
        FROM incomes
        WHERE user_id = ${userId}::uuid
          AND deleted_at IS NULL
          ${startDate ? Prisma.sql`AND date >= ${startDate}::date` : Prisma.empty}
          ${endDate ? Prisma.sql`AND date <= ${endDate}::date` : Prisma.empty}
      `,
    );

    // Get total expenses
    const expenseResult = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(amount), 0)::text as total
        FROM expenses
        WHERE user_id = ${userId}::uuid
          AND deleted_at IS NULL
          ${startDate ? Prisma.sql`AND date >= ${startDate}::date` : Prisma.empty}
          ${endDate ? Prisma.sql`AND date <= ${endDate}::date` : Prisma.empty}
      `,
    );

    // Get monthly breakdown
    const monthlyData = await this.prisma.$queryRaw<
      { month: string; income: string; expenses: string }[]
    >(
      Prisma.sql`
        SELECT 
          TO_CHAR(months.month, 'YYYY-MM') as month,
          COALESCE(income, 0)::text as income,
          COALESCE(expenses, 0)::text as expenses
        FROM (
          SELECT DISTINCT DATE_TRUNC('month', date)::date as month
          FROM (
            SELECT date FROM incomes WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
            UNION
            SELECT date FROM expenses WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
          ) dates
          ${startDate ? Prisma.sql`WHERE date >= ${startDate}::date` : Prisma.empty}
          ${endDate ? Prisma.sql`AND date <= ${endDate}::date` : Prisma.empty}
        ) months
        LEFT JOIN (
          SELECT DATE_TRUNC('month', date)::date as month, SUM(amount) as income
          FROM incomes
          WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
          GROUP BY DATE_TRUNC('month', date)
        ) i ON months.month = i.month
        LEFT JOIN (
          SELECT DATE_TRUNC('month', date)::date as month, SUM(amount) as expenses
          FROM expenses
          WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
          GROUP BY DATE_TRUNC('month', date)
        ) e ON months.month = e.month
        ORDER BY months.month DESC
      `,
    );

    const totalIncome = parseFloat(incomeResult[0]?.total || '0');
    const totalExpenses = parseFloat(expenseResult[0]?.total || '0');
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    const incomeByMonth: MonthlyComparisonDto[] = monthlyData.map((row) => {
      const income = parseFloat(row.income);
      const expenses = parseFloat(row.expenses);
      const savings = income - expenses;
      const rate = income > 0 ? (savings / income) * 100 : 0;

      return {
        month: row.month,
        income,
        expenses,
        netSavings: savings,
        savingsRate: rate,
      };
    });

    // Get expense breakdown by subcategory per month
    const subcategoryRows = await this.prisma.$queryRaw<
      {
        month: string;
        subcategory_id: string;
        subcategory_name: string;
        category_id: string;
        category_name: string;
        color_code: string | null;
        amount: string;
      }[]
    >(
      Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') as month,
          s.id as subcategory_id,
          s.name as subcategory_name,
          c.id as category_id,
          c.name as category_name,
          c.color_code,
          COALESCE(SUM(e.amount),0)::text as amount
        FROM expenses e
        JOIN subcategories s on s.id = e.subcategory_id
        JOIN categories c on c.id = s.category_id
        WHERE e.user_id = ${userId}::uuid
          AND e.deleted_at IS NULL
          ${startDate ? Prisma.sql`AND e.date >= ${startDate}::date` : Prisma.empty}
          ${endDate ? Prisma.sql`AND e.date <= ${endDate}::date` : Prisma.empty}
        GROUP BY DATE_TRUNC('month', e.date), s.id, s.name, c.id, c.name, c.color_code
        ORDER BY DATE_TRUNC('month', e.date) DESC, COALESCE(SUM(e.amount),0) DESC
      `,
    );

    const expensesBySubcategoryByMonth = subcategoryRows.map((r) => ({
      month: r.month,
      subcategoryId: r.subcategory_id,
      subcategoryName: r.subcategory_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      colorCode: r.color_code,
      amount: parseFloat(r.amount),
    }));

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      incomeByMonth,
      expensesBySubcategoryByMonth,
    };
  }

  /**
   * Get top expense items aggregated by name.
   * Groups items by name and returns total amount, count, and associated category.
   */
  async getTopExpenseItems(
    userId: string,
    params: {
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      limit?: number;
    },
  ): Promise<TopExpenseItemDto[]> {
    const { startDate, endDate, categoryId, limit = 10 } = params;

    const filters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
      Prisma.sql`ei."deleted_at" IS NULL`,
    ];

    if (startDate) filters.push(Prisma.sql`e."date" >= ${startDate}::date`);
    if (endDate) filters.push(Prisma.sql`e."date" <= ${endDate}::date`);
    if (categoryId)
      filters.push(Prisma.sql`COALESCE(ei."category_id", e."category_id") = ${categoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;

    const rows: Array<{
      name: string;
      total_amount: string;
      item_count: string;
      expense_count: string;
      category_id: string | null;
      category_name: string | null;
      color_code: string | null;
    }> = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          LOWER(TRIM(ei."name")) as name,
          COALESCE(SUM(ei."amount"), 0)::text as total_amount,
          COUNT(ei."id")::text as item_count,
          COUNT(DISTINCT ei."expense_id")::text as expense_count,
          MODE() WITHIN GROUP (ORDER BY COALESCE(ei."category_id", e."category_id")) as category_id,
          c."name" as category_name,
          c."color_code" as color_code
        FROM "expense_items" ei
        JOIN "expenses" e ON e."id" = ei."expense_id"
        LEFT JOIN "categories" c ON c."id" = COALESCE(ei."category_id", e."category_id")
        ${where}
        GROUP BY LOWER(TRIM(ei."name")), c."id", c."name", c."color_code"
        ORDER BY COALESCE(SUM(ei."amount"), 0) DESC
        LIMIT ${limit}
      `,
    );

    return rows.map((r) => ({
      name: r.name,
      totalAmount: r.total_amount,
      itemCount: parseInt(r.item_count),
      expenseCount: parseInt(r.expense_count),
      categoryId: r.category_id,
      categoryName: r.category_name,
      colorCode: r.color_code,
    }));
  }

  /**
   * Get expense line items for a specific subcategory within a date range.
   * Returns ONLY expense_items (line items), NOT expenses from the main table.
   */
  async getSubcategoryLineItems(
    userId: string,
    params: {
      subcategoryId: string;
      startDate: string;
      endDate: string;
    },
  ): Promise<{
    items: Array<{
      id: string;
      name: string;
      amount: string;
      expenseId: string;
      expenseDate: string;
      expenseDescription: string | null;
      source: 'item';
    }>;
    total: string;
  }> {
    const { subcategoryId, startDate, endDate } = params;

    // Get ONLY expense items with this subcategory (not expenses from main table)
    const itemRows: Array<{
      id: string;
      name: string;
      amount: string;
      expense_id: string;
      expense_date: Date;
      expense_description: string | null;
    }> = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          ei."id",
          ei."name",
          ei."amount"::text as amount,
          ei."expense_id",
          e."date" as expense_date,
          e."description" as expense_description
        FROM "expense_items" ei
        JOIN "expenses" e ON e."id" = ei."expense_id"
        WHERE e."user_id" = ${userId}::uuid
          AND e."deleted_at" IS NULL
          AND ei."deleted_at" IS NULL
          AND ei."subcategory_id" = ${subcategoryId}::uuid
          AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date
        ORDER BY e."date" DESC, ei."created_at" DESC
      `,
    );

    // Format results - only line items
    const items = itemRows.map((r) => ({
      id: r.id,
      name: r.name,
      amount: r.amount,
      expenseId: r.expense_id,
      expenseDate: r.expense_date.toISOString().split('T')[0],
      expenseDescription: r.expense_description,
      source: 'item' as const,
    }));

    // Calculate total
    const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2);

    return { items, total };
  }

  /**
   * Search expense items by name.
   * Supports partial matching with pagination.
   */
  async searchExpenseItems(
    userId: string,
    params: {
      query: string;
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ data: ItemSearchResultDto[]; total: number }> {
    const { query, startDate, endDate, categoryId, page = 1, pageSize = 20 } = params;
    const offset = (page - 1) * pageSize;

    // Sanitize and create search pattern
    const searchPattern = `%${query.toLowerCase().trim()}%`;

    const filters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
      Prisma.sql`ei."deleted_at" IS NULL`,
      Prisma.sql`LOWER(ei."name") LIKE ${searchPattern}`,
    ];

    if (startDate) filters.push(Prisma.sql`e."date" >= ${startDate}::date`);
    if (endDate) filters.push(Prisma.sql`e."date" <= ${endDate}::date`);
    if (categoryId)
      filters.push(Prisma.sql`COALESCE(ei."category_id", e."category_id") = ${categoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;

    // Get total count
    const countResult = await this.prisma.$queryRaw<{ count: string }[]>(
      Prisma.sql`
        SELECT COUNT(*)::text as count
        FROM "expense_items" ei
        JOIN "expenses" e ON e."id" = ei."expense_id"
        ${where}
      `,
    );
    const total = parseInt(countResult[0]?.count || '0');

    // Get paginated results
    const rows: Array<{
      id: string;
      name: string;
      amount: string;
      expense_id: string;
      expense_date: Date;
      expense_description: string | null;
      category_id: string | null;
      category_name: string | null;
      subcategory_id: string | null;
      subcategory_name: string | null;
      notes: string | null;
    }> = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          ei."id",
          ei."name",
          ei."amount"::text as amount,
          ei."expense_id",
          e."date" as expense_date,
          e."description" as expense_description,
          COALESCE(ei."category_id", e."category_id") as category_id,
          c."name" as category_name,
          COALESCE(ei."subcategory_id", e."subcategory_id") as subcategory_id,
          s."name" as subcategory_name,
          ei."notes"
        FROM "expense_items" ei
        JOIN "expenses" e ON e."id" = ei."expense_id"
        LEFT JOIN "categories" c ON c."id" = COALESCE(ei."category_id", e."category_id")
        LEFT JOIN "subcategories" s ON s."id" = COALESCE(ei."subcategory_id", e."subcategory_id")
        ${where}
        ORDER BY e."date" DESC, ei."created_at" DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `,
    );

    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        amount: r.amount,
        expenseId: r.expense_id,
        expenseDate: r.expense_date.toISOString().split('T')[0],
        expenseDescription: r.expense_description,
        categoryId: r.category_id,
        categoryName: r.category_name,
        subcategoryId: r.subcategory_id,
        subcategoryName: r.subcategory_name,
        notes: r.notes,
      })),
      total,
    };
  }
}
