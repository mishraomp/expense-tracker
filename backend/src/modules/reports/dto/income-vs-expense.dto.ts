import { IsDateString, IsOptional } from 'class-validator';

/**
 * Query parameters for the income-vs-expense report.
 */
export class IncomeVsExpenseQueryDto {
  /**
   * YYYY-MM-DD. Omitting both startDate and endDate sums ALL-TIME
   * income/expenses — there is no default date range.
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * YYYY-MM-DD. Omitting both startDate and endDate sums ALL-TIME
   * income/expenses — there is no default date range.
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Response for the income-vs-expense report.
 */
export class IncomeVsExpenseResponseDto {
  /**
   * Total income over the requested range (or all-time, if no range given).
   */
  totalIncome: number;

  /**
   * Total expenses over the requested range (or all-time, if no range
   * given).
   */
  totalExpenses: number;

  /**
   * totalIncome - totalExpenses.
   */
  netSavings: number;

  /**
   * netSavings / totalIncome * 100, or 0 when totalIncome is 0.
   */
  savingsRate: number;

  /**
   * Per-month income/expense/savings breakdown.
   */
  incomeByMonth: MonthlyComparisonDto[];

  /**
   * Breakdown of expenses per subcategory for each month.
   */
  expensesBySubcategoryByMonth?: SubcategorySpendingByMonthDto[];
}

/**
 * One month's income vs. expense comparison.
 */
export class MonthlyComparisonDto {
  /**
   * Month, formatted YYYY-MM.
   */
  month: string;

  /**
   * Total income for this month.
   */
  income: number;

  /**
   * Total expenses for this month.
   */
  expenses: number;

  /**
   * income - expenses for this month.
   */
  netSavings: number;

  /**
   * netSavings / income * 100 for this month, or 0 when income is 0.
   */
  savingsRate: number;
}

/**
 * Expense spending for one subcategory in one month.
 */
export class SubcategorySpendingByMonthDto {
  /**
   * Month, e.g. YYYY-MM.
   */
  month: string;

  /**
   * Subcategory UUID.
   */
  subcategoryId: string;

  /**
   * Subcategory name.
   */
  subcategoryName: string;

  /**
   * Parent category UUID.
   */
  categoryId: string;

  /**
   * Parent category name.
   */
  categoryName: string;

  /**
   * Parent category's display color, if any.
   */
  colorCode?: string | null;

  /**
   * Numeric amount spent in this subcategory during this month.
   */
  amount: number;
}
