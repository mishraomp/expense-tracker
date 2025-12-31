import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getCategoryBudgetForDisplay,
  upsertCategoryBudget,
  removeCategoryBudgets,
  computeBudgetDateRange,
} from '../../common/budgets';

/**
 * Extended category with derived budget fields for API compatibility
 */
export interface CategoryWithBudget {
  id: string;
  name: string;
  type: string;
  colorCode: string | null;
  icon: string | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  budgetAmount: string | null;
  budgetPeriod: 'monthly' | 'annual' | null;
  budgetStartDate: string | null;
  budgetEndDate: string | null;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all categories for a user (predefined + custom).
   * Returns categories with derived budget fields for backward compatibility.
   * @param userId - User ID
   * @param targetDate - Optional date to check for active budgets (defaults to today)
   */
  async findAll(userId: string, targetDate?: Date): Promise<CategoryWithBudget[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        deletedAt: null,
        OR: [{ type: 'predefined' }, { type: 'custom', userId }],
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    // Enrich with budget data
    const result: CategoryWithBudget[] = [];
    for (const cat of categories) {
      const budget = await getCategoryBudgetForDisplay(this.prisma, cat.id, targetDate);
      result.push({
        ...cat,
        type: cat.type,
        budgetAmount: budget.budgetAmount,
        budgetPeriod: budget.budgetPeriod,
        budgetStartDate: budget.budgetStartDate,
        budgetEndDate: budget.budgetEndDate,
      });
    }

    return result;
  }

  async create(
    userId: string,
    data: {
      name: string;
      colorCode?: string;
      icon?: string;
      budgetAmount?: string | number;
      budgetPeriod?: 'monthly' | 'annual';
      budgetStartDate?: string;
      budgetEndDate?: string;
    },
  ): Promise<CategoryWithBudget> {
    // Prevent duplicates (case-insensitive) per user among custom categories
    const existing = await this.prisma.category.findFirst({
      where: {
        deletedAt: null,
        type: 'custom',
        userId,
        name: { equals: data.name, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Category name already exists');
    }

    // Create category without budget fields (they're now in separate table)
    const category = await this.prisma.category.create({
      data: {
        type: 'custom',
        userId,
        name: data.name,
        colorCode: data.colorCode,
        icon: data.icon,
      },
    });

    // Create budget if provided
    let budgetAmount: string | null = null;
    let budgetPeriod: 'monthly' | 'annual' | null = null;
    let budgetStartDate: string | null = null;
    let budgetEndDate: string | null = null;

    if (data.budgetAmount !== undefined) {
      const { startDate, endDate } = computeBudgetDateRange(
        data.budgetPeriod,
        data.budgetStartDate,
        data.budgetEndDate,
      );
      await upsertCategoryBudget(
        this.prisma,
        category.id,
        userId,
        data.budgetAmount,
        startDate,
        endDate,
      );
      const budget = await getCategoryBudgetForDisplay(this.prisma, category.id);
      budgetAmount = budget.budgetAmount;
      budgetPeriod = budget.budgetPeriod;
      budgetStartDate = budget.budgetStartDate;
      budgetEndDate = budget.budgetEndDate;
    }

    return {
      ...category,
      type: category.type,
      budgetAmount,
      budgetPeriod,
      budgetStartDate,
      budgetEndDate,
    };
  }

  async update(
    userId: string,
    id: string,
    data: {
      name?: string;
      colorCode?: string;
      icon?: string;
      budgetAmount?: string | number | null;
      budgetPeriod?: 'monthly' | 'annual' | null;
      budgetStartDate?: string | null;
      budgetEndDate?: string | null;
    },
  ): Promise<CategoryWithBudget> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found');
    }
    if (category.type === 'predefined') {
      // Allow limited edits for predefined categories: color and budget only
      if (data.name && data.name !== category.name) {
        throw new ForbiddenException('Cannot change name of predefined category');
      }
      if (data.icon && data.icon !== category.icon) {
        throw new ForbiddenException('Cannot change icon of predefined category');
      }

      // Update category (only colorCode since name/icon are protected)
      const updated = await this.prisma.category.update({
        where: { id },
        data: {
          colorCode: data.colorCode ?? category.colorCode,
        },
      });

      // Handle budget update
      if (data.budgetAmount === null) {
        await removeCategoryBudgets(this.prisma, id);
      } else if (data.budgetAmount !== undefined) {
        const { startDate, endDate } = computeBudgetDateRange(
          data.budgetPeriod,
          data.budgetStartDate,
          data.budgetEndDate,
        );
        await upsertCategoryBudget(
          this.prisma,
          id,
          category.userId,
          data.budgetAmount,
          startDate,
          endDate,
        );
      }

      const budget = await getCategoryBudgetForDisplay(this.prisma, id);
      return {
        ...updated,
        type: updated.type,
        budgetAmount: budget.budgetAmount,
        budgetPeriod: budget.budgetPeriod,
        budgetStartDate: budget.budgetStartDate,
        budgetEndDate: budget.budgetEndDate,
      };
    }

    if (category.userId !== userId) {
      throw new ForbiddenException('Not allowed to modify this category');
    }

    // If name is changing, enforce uniqueness (case-insensitive)
    if (data.name && data.name !== category.name) {
      const dup = await this.prisma.category.findFirst({
        where: {
          deletedAt: null,
          type: 'custom',
          userId,
          name: { equals: data.name, mode: 'insensitive' },
          NOT: { id },
        },
        select: { id: true },
      });
      if (dup) {
        throw new BadRequestException('Category name already exists');
      }
    }

    // Update category fields
    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: data.name ?? category.name,
        colorCode: data.colorCode ?? category.colorCode,
        icon: data.icon ?? category.icon,
      },
    });

    // Handle budget update
    if (data.budgetAmount === null) {
      await removeCategoryBudgets(this.prisma, id);
    } else if (data.budgetAmount !== undefined) {
      const { startDate, endDate } = computeBudgetDateRange(
        data.budgetPeriod,
        data.budgetStartDate,
        data.budgetEndDate,
      );
      await upsertCategoryBudget(this.prisma, id, userId, data.budgetAmount, startDate, endDate);
    }

    const budget = await getCategoryBudgetForDisplay(this.prisma, id);
    return {
      ...updated,
      type: updated.type,
      budgetAmount: budget.budgetAmount,
      budgetPeriod: budget.budgetPeriod,
      budgetStartDate: budget.budgetStartDate,
      budgetEndDate: budget.budgetEndDate,
    };
  }

  async remove(userId: string, id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found');
    }
    if (category.type === 'predefined') {
      throw new ForbiddenException('Cannot delete predefined category');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('Not allowed to delete this category');
    }

    await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
