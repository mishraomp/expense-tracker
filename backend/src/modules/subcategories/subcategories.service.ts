import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubcategoryDto, UpdateSubcategoryDto } from './dto';
import { Subcategory } from './subcategory.entity';
import {
  getSubcategoryBudgetForDisplay,
  upsertSubcategoryBudget,
  removeSubcategoryBudgets,
  computeBudgetDateRange,
} from '../../common/budgets';

/**
 * Extended subcategory with derived budget fields for API compatibility
 */
export interface SubcategoryWithBudget extends Subcategory {
  budgetAmount: string | null;
  budgetPeriod: 'monthly' | 'annual' | null;
  budgetStartDate: string | null;
  budgetEndDate: string | null;
}

@Injectable()
export class SubcategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubcategoryDto): Promise<SubcategoryWithBudget> {
    // Ensure parent category exists
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new BadRequestException('Parent category does not exist');
    }

    try {
      const subcategory = await this.prisma.subcategory.create({
        data: {
          name: dto.name.trim(),
          categoryId: dto.categoryId,
        },
      });

      // Create budget if provided
      let budgetAmount: string | null = null;
      let budgetPeriod: 'monthly' | 'annual' | null = null;
      let budgetStartDate: string | null = null;
      let budgetEndDate: string | null = null;

      if (dto.budgetAmount !== undefined) {
        const { startDate, endDate } = computeBudgetDateRange(
          dto.budgetPeriod,
          dto.budgetStartDate,
          dto.budgetEndDate,
        );
        await upsertSubcategoryBudget(
          this.prisma,
          subcategory.id,
          category.userId,
          dto.budgetAmount,
          startDate,
          endDate,
        );
        const budget = await getSubcategoryBudgetForDisplay(this.prisma, subcategory.id);
        budgetAmount = budget.budgetAmount;
        budgetPeriod = budget.budgetPeriod;
        budgetStartDate = budget.budgetStartDate;
        budgetEndDate = budget.budgetEndDate;
      }

      return {
        ...subcategory,
        budgetAmount,
        budgetPeriod,
        budgetStartDate,
        budgetEndDate,
      };
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Subcategory name must be unique within the category');
      }
      if (
        typeof e.message === 'string' &&
        e.message.includes('Cannot create more than 50 subcategories')
      ) {
        throw new ConflictException('Cannot create more than 50 subcategories per category');
      }
      throw e;
    }
  }

  async findAll(categoryId?: string): Promise<SubcategoryWithBudget[]> {
    const subcategories = await this.prisma.subcategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { name: 'asc' },
    });

    // Enrich with budget data
    const result: SubcategoryWithBudget[] = [];
    for (const sub of subcategories) {
      const budget = await getSubcategoryBudgetForDisplay(this.prisma, sub.id);
      result.push({
        ...sub,
        budgetAmount: budget.budgetAmount,
        budgetPeriod: budget.budgetPeriod,
        budgetStartDate: budget.budgetStartDate,
        budgetEndDate: budget.budgetEndDate,
      });
    }

    return result;
  }

  async findOne(id: string): Promise<SubcategoryWithBudget> {
    const subcategory = await this.prisma.subcategory.findUnique({ where: { id } });
    if (!subcategory) throw new NotFoundException('Subcategory not found');

    const budget = await getSubcategoryBudgetForDisplay(this.prisma, id);
    return {
      ...subcategory,
      budgetAmount: budget.budgetAmount,
      budgetPeriod: budget.budgetPeriod,
      budgetStartDate: budget.budgetStartDate,
      budgetEndDate: budget.budgetEndDate,
    };
  }

  async findOneWithCategory(
    id: string,
  ): Promise<SubcategoryWithBudget & { category?: { id: string; name: string } }> {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!subcategory) throw new NotFoundException('Subcategory not found');

    const budget = await getSubcategoryBudgetForDisplay(this.prisma, id);
    return {
      ...subcategory,
      budgetAmount: budget.budgetAmount,
      budgetPeriod: budget.budgetPeriod,
      budgetStartDate: budget.budgetStartDate,
      budgetEndDate: budget.budgetEndDate,
    } as any;
  }

  async update(id: string, dto: UpdateSubcategoryDto): Promise<SubcategoryWithBudget> {
    // Get existing subcategory to find its category's user
    const existing = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!existing) {
      throw new NotFoundException('Subcategory not found');
    }

    // If moving to a different category, ensure target exists
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException('Target category does not exist');
    }

    try {
      const subcategory = await this.prisma.subcategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name?.trim() } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        },
      });

      // Handle budget update
      if (dto.budgetAmount === null) {
        await removeSubcategoryBudgets(this.prisma, id);
      } else if (dto.budgetAmount !== undefined) {
        const { startDate, endDate } = computeBudgetDateRange(
          dto.budgetPeriod,
          dto.budgetStartDate,
          dto.budgetEndDate,
        );
        await upsertSubcategoryBudget(
          this.prisma,
          id,
          existing.category.userId,
          dto.budgetAmount,
          startDate,
          endDate,
        );
      }

      const budget = await getSubcategoryBudgetForDisplay(this.prisma, id);
      return {
        ...subcategory,
        budgetAmount: budget.budgetAmount,
        budgetPeriod: budget.budgetPeriod,
        budgetStartDate: budget.budgetStartDate,
        budgetEndDate: budget.budgetEndDate,
      };
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Subcategory name must be unique within the category');
      }
      throw e;
    }
  }

  async remove(id: string): Promise<{ affectedExpenses: number }> {
    // Count affected expenses first
    const affectedExpenses = await this.prisma.expense.count({ where: { subcategoryId: id } });
    await this.prisma.subcategory.delete({ where: { id } });
    return { affectedExpenses };
  }

  async expensesCount(id: string): Promise<{ count: number }> {
    const count = await this.prisma.expense.count({ where: { subcategoryId: id } });
    return { count };
  }
}
