import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client.js';

/**
 * Budget data returned from selection helpers
 */
export interface ActiveBudget {
  id: string;
  amount: Decimal;
  startDate: Date;
  endDate: Date;
  categoryId: string | null;
  subcategoryId: string | null;
}

/**
 * Budget selection result with derived legacy fields for backward compatibility
 */
export interface BudgetSelectionResult {
  budgetAmount: Decimal | null;
  budgetPeriod: 'monthly' | 'annual' | null;
  budgetSource: 'subcategory' | 'category' | null;
  budget: ActiveBudget | null;
}

/**
 * Derives the legacy `budgetPeriod` from a budget's date range.
 *
 * Rules:
 * - If range matches exactly one calendar month → 'monthly'
 * - If range matches exactly one calendar year → 'annual'
 * - If range is wide (1970-01-01 to 9999-12-31) → null (legacy recurring)
 * - Otherwise → null
 */
export function deriveBudgetPeriod(startDate: Date, endDate: Date): 'monthly' | 'annual' | null {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Wide range = legacy recurring budget
  if (
    start.getFullYear() === 1970 &&
    start.getMonth() === 0 &&
    start.getDate() === 1 &&
    end.getFullYear() === 9999 &&
    end.getMonth() === 11 &&
    end.getDate() === 31
  ) {
    return null;
  }

  // Check for exact calendar month
  if (
    start.getDate() === 1 &&
    end.getFullYear() === start.getFullYear() &&
    end.getMonth() === start.getMonth()
  ) {
    // Check if end date is last day of month
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    if (end.getDate() === lastDayOfMonth) {
      return 'monthly';
    }
  }

  // Check for exact calendar year (Jan 1 - Dec 31 of same year)
  if (
    start.getMonth() === 0 &&
    start.getDate() === 1 &&
    end.getMonth() === 11 &&
    end.getDate() === 31 &&
    end.getFullYear() === start.getFullYear()
  ) {
    return 'annual';
  }

  return null;
}

/**
 * Selects the active budget for a category at a given date.
 *
 * Selection rule: Among budgets where start_date <= date <= end_date,
 * pick the one with greatest updated_at (tie-breaker: greatest created_at, then greatest id).
 */
export async function selectActiveCategoryBudget(
  prisma: PrismaService,
  categoryId: string,
  targetDate: Date,
): Promise<ActiveBudget | null> {
  const budget = await prisma.budget.findFirst({
    where: {
      categoryId,
      startDate: { lte: targetDate },
      endDate: { gte: targetDate },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
  });

  return budget;
}

/**
 * Selects the active budget for a subcategory at a given date.
 *
 * Selection rule: Among budgets where start_date <= date <= end_date,
 * pick the one with greatest updated_at (tie-breaker: greatest created_at, then greatest id).
 */
export async function selectActiveSubcategoryBudget(
  prisma: PrismaService,
  subcategoryId: string,
  targetDate: Date,
): Promise<ActiveBudget | null> {
  const budget = await prisma.budget.findFirst({
    where: {
      subcategoryId,
      startDate: { lte: targetDate },
      endDate: { gte: targetDate },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
  });

  return budget;
}

/**
 * Selects the effective budget for a category/subcategory pair with precedence.
 * Subcategory budget takes precedence over category budget.
 *
 * @param prisma - PrismaService instance
 * @param categoryId - Category ID
 * @param subcategoryId - Optional subcategory ID
 * @param targetDate - Date to check for active budget (defaults to today)
 * @returns Budget selection result with derived legacy fields
 */
export async function selectEffectiveBudget(
  prisma: PrismaService,
  categoryId: string,
  subcategoryId: string | null,
  targetDate: Date = new Date(),
): Promise<BudgetSelectionResult> {
  // Check subcategory budget first (takes precedence)
  if (subcategoryId) {
    const subcatBudget = await selectActiveSubcategoryBudget(prisma, subcategoryId, targetDate);
    if (subcatBudget) {
      return {
        budgetAmount: subcatBudget.amount,
        budgetPeriod: deriveBudgetPeriod(subcatBudget.startDate, subcatBudget.endDate),
        budgetSource: 'subcategory',
        budget: subcatBudget,
      };
    }
  }

  // Fall back to category budget
  const catBudget = await selectActiveCategoryBudget(prisma, categoryId, targetDate);
  if (catBudget) {
    return {
      budgetAmount: catBudget.amount,
      budgetPeriod: deriveBudgetPeriod(catBudget.startDate, catBudget.endDate),
      budgetSource: 'category',
      budget: catBudget,
    };
  }

  return {
    budgetAmount: null,
    budgetPeriod: null,
    budgetSource: null,
    budget: null,
  };
}

/**
 * Gets all budgets for a category, sorted by date range.
 */
export async function getCategoryBudgets(
  prisma: PrismaService,
  categoryId: string,
): Promise<ActiveBudget[]> {
  return prisma.budget.findMany({
    where: { categoryId },
    orderBy: [{ startDate: 'desc' }, { updatedAt: 'desc' }],
  });
}

/**
 * Gets all budgets for a subcategory, sorted by date range.
 */
export async function getSubcategoryBudgets(
  prisma: PrismaService,
  subcategoryId: string,
): Promise<ActiveBudget[]> {
  return prisma.budget.findMany({
    where: { subcategoryId },
    orderBy: [{ startDate: 'desc' }, { updatedAt: 'desc' }],
  });
}

/**
 * Creates or updates a budget for a category.
 * Uses wide date range (1970-01-01 to 9999-12-31) for backward compatibility
 * when no explicit dates are provided.
 *
 * @param prisma - PrismaService instance
 * @param categoryId - Category ID
 * @param userId - User ID (for ownership)
 * @param amount - Budget amount
 * @param startDate - Optional start date (defaults to 1970-01-01 for legacy)
 * @param endDate - Optional end date (defaults to 9999-12-31 for legacy)
 */
export async function upsertCategoryBudget(
  prisma: PrismaService,
  categoryId: string,
  userId: string | null,
  amount: Decimal | number | string,
  startDate?: Date,
  endDate?: Date,
): Promise<ActiveBudget> {
  const start = startDate ?? new Date('1970-01-01');
  const end = endDate ?? new Date('9999-12-31');
  const budgetAmount = new Decimal(amount.toString());

  // Find existing budget with same date range (for upsert semantics)
  const existing = await prisma.budget.findFirst({
    where: {
      categoryId,
      startDate: start,
      endDate: end,
    },
  });

  if (existing) {
    return prisma.budget.update({
      where: { id: existing.id },
      data: { amount: budgetAmount },
    });
  }

  return prisma.budget.create({
    data: {
      categoryId,
      subcategoryId: null,
      userId,
      amount: budgetAmount,
      startDate: start,
      endDate: end,
    },
  });
}

/**
 * Creates or updates a budget for a subcategory.
 * Uses wide date range (1970-01-01 to 9999-12-31) for backward compatibility
 * when no explicit dates are provided.
 */
export async function upsertSubcategoryBudget(
  prisma: PrismaService,
  subcategoryId: string,
  userId: string | null,
  amount: Decimal | number | string,
  startDate?: Date,
  endDate?: Date,
): Promise<ActiveBudget> {
  const start = startDate ?? new Date('1970-01-01');
  const end = endDate ?? new Date('9999-12-31');
  const budgetAmount = new Decimal(amount.toString());

  // Find existing budget with same date range (for upsert semantics)
  const existing = await prisma.budget.findFirst({
    where: {
      subcategoryId,
      startDate: start,
      endDate: end,
    },
  });

  if (existing) {
    return prisma.budget.update({
      where: { id: existing.id },
      data: { amount: budgetAmount },
    });
  }

  return prisma.budget.create({
    data: {
      categoryId: null,
      subcategoryId,
      userId,
      amount: budgetAmount,
      startDate: start,
      endDate: end,
    },
  });
}

/**
 * Removes all budgets for a category (with optional date range filter).
 */
export async function removeCategoryBudgets(
  prisma: PrismaService,
  categoryId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<number> {
  const where: any = { categoryId };
  if (startDate) where.startDate = startDate;
  if (endDate) where.endDate = endDate;

  const result = await prisma.budget.deleteMany({ where });
  return result.count;
}

/**
 * Removes all budgets for a subcategory (with optional date range filter).
 */
export async function removeSubcategoryBudgets(
  prisma: PrismaService,
  subcategoryId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<number> {
  const where: any = { subcategoryId };
  if (startDate) where.startDate = startDate;
  if (endDate) where.endDate = endDate;

  const result = await prisma.budget.deleteMany({ where });
  return result.count;
}

/**
 * Gets the active budget with derived legacy fields for display purposes.
 * This is a convenience wrapper for API responses that need legacy field compatibility.
 */
export async function getCategoryBudgetForDisplay(
  prisma: PrismaService,
  categoryId: string,
  targetDate: Date = new Date(),
): Promise<{
  budgetAmount: string | null;
  budgetPeriod: 'monthly' | 'annual' | null;
  budgetStartDate: string | null;
  budgetEndDate: string | null;
}> {
  const budget = await selectActiveCategoryBudget(prisma, categoryId, targetDate);
  if (!budget) {
    return { budgetAmount: null, budgetPeriod: null, budgetStartDate: null, budgetEndDate: null };
  }
  return {
    budgetAmount: budget.amount.toString(),
    budgetPeriod: deriveBudgetPeriod(budget.startDate, budget.endDate),
    budgetStartDate: budget.startDate.toISOString().split('T')[0],
    budgetEndDate: budget.endDate.toISOString().split('T')[0],
  };
}

/**
 * Gets the active budget with derived legacy fields for display purposes.
 * This is a convenience wrapper for API responses that need legacy field compatibility.
 */
export async function getSubcategoryBudgetForDisplay(
  prisma: PrismaService,
  subcategoryId: string,
  targetDate: Date = new Date(),
): Promise<{
  budgetAmount: string | null;
  budgetPeriod: 'monthly' | 'annual' | null;
  budgetStartDate: string | null;
  budgetEndDate: string | null;
}> {
  const budget = await selectActiveSubcategoryBudget(prisma, subcategoryId, targetDate);
  if (!budget) {
    return { budgetAmount: null, budgetPeriod: null, budgetStartDate: null, budgetEndDate: null };
  }
  return {
    budgetAmount: budget.amount.toString(),
    budgetPeriod: deriveBudgetPeriod(budget.startDate, budget.endDate),
    budgetStartDate: budget.startDate.toISOString().split('T')[0],
    budgetEndDate: budget.endDate.toISOString().split('T')[0],
  };
}

/**
 * Computes budget date range from explicit dates, legacy period, or defaults.
 * Priority:
 * 1. Explicit startDate/endDate if both provided
 * 2. Legacy budgetPeriod ('monthly' = current month, 'annual' = current year)
 * 3. Wide range (1970-01-01 to 9999-12-31) as fallback for recurring budgets
 */
export function computeBudgetDateRange(
  budgetPeriod?: 'monthly' | 'annual' | null,
  explicitStartDate?: string | Date | null,
  explicitEndDate?: string | Date | null,
): { startDate: Date; endDate: Date } {
  // If both explicit dates provided, use them
  if (explicitStartDate && explicitEndDate) {
    return {
      startDate: new Date(explicitStartDate),
      endDate: new Date(explicitEndDate),
    };
  }

  // If legacy budgetPeriod provided, compute dates for current period
  if (budgetPeriod === 'monthly') {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate, endDate };
  }

  if (budgetPeriod === 'annual') {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    const endDate = new Date(now.getFullYear(), 11, 31);
    return { startDate, endDate };
  }

  // Default: wide range for recurring budgets (legacy behavior)
  return {
    startDate: new Date('1970-01-01'),
    endDate: new Date('9999-12-31'),
  };
}
