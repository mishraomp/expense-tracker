import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { deriveBudgetPeriod } from '../../common/budgets/budget-select';
import { BudgetVsActualPointDto, BudgetVsActualQueryDto } from './dto/budget-vs-actual.dto';

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
export class BudgetReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBudgetVsActual(
    userId: string,
    q: BudgetVsActualQueryDto,
  ): Promise<BudgetVsActualPointDto[]> {
    const { startDate, endDate, categoryId, subcategoryId } = q;

    // Determine a monthly-equivalent budget figure according to precedence rules:
    // subcategory budgets overlapping the requested range take precedence over
    // category budgets (same precedence as selectEffectiveBudget in
    // common/budgets/budget-select.ts). Reads from the `budgets` table — the
    // category/subcategory budget_amount columns this used to read from were
    // dropped by migration V3.2.0__separate_budget_entity.sql.
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    const overlap = { startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } };
    const ownedOrGlobal = { OR: [{ userId }, { userId: null }] };

    const subBudgets = await this.prisma.budget.findMany({
      where: subcategoryId
        ? { ...overlap, subcategoryId }
        : {
            ...overlap,
            subcategoryId: { not: null },
            subcategory: { category: categoryId ? { id: categoryId } : ownedOrGlobal },
          },
    });

    const catBudgets =
      subBudgets.length > 0
        ? []
        : await this.prisma.budget.findMany({
            where: categoryId
              ? { ...overlap, categoryId }
              : { ...overlap, categoryId: { not: null }, category: ownedOrGlobal },
          });

    const monthlyEquivalent = (b: {
      amount: Prisma.Decimal;
      startDate: Date;
      endDate: Date;
    }): number =>
      deriveBudgetPeriod(b.startDate, b.endDate) === 'annual'
        ? Number(b.amount) / 12
        : Number(b.amount);

    const monthlyBudget = (subBudgets.length > 0 ? subBudgets : catBudgets)
      .reduce((sum, b) => sum + monthlyEquivalent(b), 0)
      .toString();

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

  // Category budget report from DB view
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

  // Subcategory budget report from DB view
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

  /**
   * Get total budget amount for a date range.
   * Sums all budgets (both category-level and subcategory-level) that overlap with the date range.
   */
  async getTotalBudget(
    userId: string,
    params: { startDate: string; endDate: string },
  ): Promise<{ totalBudget: number }> {
    const { startDate, endDate } = params;

    // Sum all budgets where the budget period overlaps with the requested date range
    // A budget overlaps if: budget.start_date <= endDate AND budget.end_date >= startDate
    // For subcategory budgets, we get the user via the parent category
    const result = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(b.amount), 0)::text as total
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN subcategories s ON b.subcategory_id = s.id
        LEFT JOIN categories sc ON s.category_id = sc.id
        WHERE b.start_date <= ${endDate}::date
          AND b.end_date >= ${startDate}::date
          AND (
            (b.category_id IS NOT NULL AND (c.user_id = ${userId}::uuid OR c.user_id IS NULL))
            OR
            (b.subcategory_id IS NOT NULL AND (sc.user_id = ${userId}::uuid OR sc.user_id IS NULL))
          )
      `,
    );

    return {
      totalBudget: parseFloat(result[0]?.total || '0'),
    };
  }

  /**
   * Get total expenses against budgeted categories for a date range.
   * Only counts expenses where the category/subcategory has a budget that overlaps the date range.
   */
  async getBudgetedExpenses(
    userId: string,
    params: { startDate: string; endDate: string },
  ): Promise<{ budgetedExpenses: number }> {
    const { startDate, endDate } = params;

    // Get expenses where the category or subcategory has a budget overlapping the date range
    // We consider an expense "budgeted" if:
    // 1. The expense's category has a category-level budget that overlaps, OR
    // 2. The expense's subcategory has a subcategory-level budget that overlaps
    const result = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(e.amount), 0)::text as total
        FROM expenses e
        WHERE e.user_id = ${userId}::uuid
          AND e.deleted_at IS NULL
          AND e.date >= ${startDate}::date
          AND e.date <= ${endDate}::date
          AND (
            -- Category has a budget overlapping the date range
            EXISTS (
              SELECT 1 FROM budgets b
              WHERE b.category_id = e.category_id
                AND b.start_date <= ${endDate}::date
                AND b.end_date >= ${startDate}::date
            )
            OR
            -- Subcategory has a budget overlapping the date range
            EXISTS (
              SELECT 1 FROM budgets b
              WHERE b.subcategory_id = e.subcategory_id
                AND e.subcategory_id IS NOT NULL
                AND b.start_date <= ${endDate}::date
                AND b.end_date >= ${startDate}::date
            )
          )
      `,
    );

    return {
      budgetedExpenses: parseFloat(result[0]?.total || '0'),
    };
  }
}
