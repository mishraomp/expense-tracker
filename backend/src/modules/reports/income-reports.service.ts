import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  IncomeVsExpenseQueryDto,
  IncomeVsExpenseResponseDto,
  MonthlyComparisonDto,
} from './dto/income-vs-expense.dto';

@Injectable()
export class IncomeReportsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
