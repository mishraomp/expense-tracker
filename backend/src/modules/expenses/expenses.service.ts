import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseResponseDto, ExpenseListResponseDto } from './dto/expense-response.dto';
import { ExpenseListQueryDto } from './dto/expense-list-query.dto';
import { Decimal } from '@prisma/client/runtime/client.js';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createExpenseDto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    // Validate amount is positive
    if (createExpenseDto.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // If subcategoryId provided, verify it exists and belongs to the same category
    if (createExpenseDto.subcategoryId) {
      const sub = await this.prisma.subcategory.findUnique({
        where: { id: createExpenseDto.subcategoryId },
      });
      if (!sub) {
        throw new Error('Subcategory does not exist');
      }
      if (sub.categoryId !== createExpenseDto.categoryId) {
        throw new Error('Subcategory does not belong to the provided category');
      }
    }

    // Handle recurring expenses
    if (
      createExpenseDto.recurring &&
      createExpenseDto.recurrenceFrequency &&
      createExpenseDto.numberOfRecurrences
    ) {
      return this.createRecurringExpenses(userId, createExpenseDto);
    }

    // Create single expense
    const expense = await this.prisma.expense.create({
      data: {
        userId,
        categoryId: createExpenseDto.categoryId,
        subcategoryId: createExpenseDto.subcategoryId,
        amount: new Decimal(createExpenseDto.amount),
        date: new Date(createExpenseDto.date),
        description: createExpenseDto.description,
        source: createExpenseDto.source || 'manual',
        status: 'confirmed',
      },
      include: { category: true, subcategory: true },
    });

    return ExpenseResponseDto.fromEntity(expense);
  }

  private async createRecurringExpenses(
    userId: string,
    createExpenseDto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const baseDate = new Date(createExpenseDto.date);
    const expenses = [];

    // Calculate dates based on frequency
    for (let i = 0; i < createExpenseDto.numberOfRecurrences; i++) {
      const expenseDate = new Date(baseDate);

      switch (createExpenseDto.recurrenceFrequency) {
        case 'weekly':
          expenseDate.setDate(baseDate.getDate() + i * 7);
          break;
        case 'biweekly':
          expenseDate.setDate(baseDate.getDate() + i * 14);
          break;
        case 'monthly':
          expenseDate.setMonth(baseDate.getMonth() + i);
          break;
        case 'quarterly':
          expenseDate.setMonth(baseDate.getMonth() + i * 3);
          break;
        case 'yearly':
          expenseDate.setFullYear(baseDate.getFullYear() + i);
          break;
      }

      expenses.push({
        userId,
        categoryId: createExpenseDto.categoryId,
        subcategoryId: createExpenseDto.subcategoryId,
        amount: new Decimal(createExpenseDto.amount),
        date: expenseDate,
        description: createExpenseDto.description,
        source: createExpenseDto.source || 'manual',
        status: 'confirmed',
      });
    }

    // Create all expenses in a transaction
    const createdExpenses = await this.prisma.$transaction(
      expenses.map((expenseData) =>
        this.prisma.expense.create({
          data: expenseData,
          include: { category: true, subcategory: true },
        }),
      ),
    );

    // Return the first expense as the response
    return ExpenseResponseDto.fromEntity(createdExpenses[0]);
  }

  async findAll(userId: string, query: ExpenseListQueryDto): Promise<ExpenseListResponseDto> {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      subcategoryId,
      startDate,
      endDate,
      filterYear,
      filterMonth,
      sortOrder = 'desc',
      sortBy = 'date',
    } = query;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = { userId, deletedAt: null };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (subcategoryId) {
      where.subcategoryId = subcategoryId;
    }

    // Date filters can be (start/end) OR (filterYear/filterMonth)
    const dateOr: any[] = [];
    if (startDate || endDate) {
      const cond: any = {};
      if (startDate) cond.gte = new Date(startDate);
      if (endDate) cond.lte = new Date(endDate);
      dateOr.push({ date: cond });
    }
    if (filterYear) {
      const y = filterYear;
      const m = filterMonth ? filterMonth - 1 : undefined; // JS month 0-11
      const from = m !== undefined ? new Date(y, m, 1) : new Date(y, 0, 1);
      const to = m !== undefined ? new Date(y, m + 1, 0) : new Date(y, 11, 31);
      dateOr.push({ date: { gte: from, lte: to } });
    }
    if (dateOr.length === 1) {
      // Single condition
      where.date = dateOr[0].date;
    } else if (dateOr.length > 1) {
      // Multiple conditions OR'ed together
      where.OR = dateOr;
    }

    // Fetch expenses, total count and sum in parallel
    // Map sortBy to valid fields
    const validSortFields = ['date', 'amount', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'date';
    const [expenses, total, sumAgg] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { category: true, subcategory: true },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: pageSize,
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const totalAmount = (sumAgg._sum.amount ?? new Decimal(0)).toNumber();

    return {
      data: expenses.map(ExpenseResponseDto.fromEntity),
      pagination: { page, limit: pageSize, total, totalPages },
      summary: { totalAmount, count: total },
    };
  }

  async findOne(userId: string, id: string): Promise<ExpenseResponseDto> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true, subcategory: true },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return ExpenseResponseDto.fromEntity(expense);
  }

  async update(
    userId: string,
    id: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    // Check if expense exists
    await this.findOne(userId, id);

    // Validate amount if provided
    if (updateExpenseDto.amount !== undefined && updateExpenseDto.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Build update data
    const data: any = {};
    if (updateExpenseDto.amount !== undefined) {
      data.amount = new Decimal(updateExpenseDto.amount);
    }
    if (updateExpenseDto.categoryId !== undefined) {
      data.categoryId = updateExpenseDto.categoryId;
    }
    if (updateExpenseDto.subcategoryId !== undefined) {
      data.subcategoryId = updateExpenseDto.subcategoryId;
    }
    if (updateExpenseDto.date !== undefined) {
      data.date = new Date(updateExpenseDto.date);
    }
    if (updateExpenseDto.description !== undefined) {
      data.description = updateExpenseDto.description;
    }

    const expense = await this.prisma.expense.update({
      where: { id },
      data,
      include: { category: true, subcategory: true },
    });

    return ExpenseResponseDto.fromEntity(expense);
  }

  async remove(userId: string, id: string): Promise<void> {
    // Check if expense exists
    await this.findOne(userId, id);

    // Soft delete
    await this.prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /**
   * Calculate total expenses with Decimal precision
   * This method uses Decimal arithmetic to ensure accuracy in financial calculations
   * @param userId - User ID to calculate totals for
   * @param categoryId - Optional category filter
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Total amount as Decimal
   */
  async calculateTotals(
    userId: string,
    categoryId?: string,
    subcategoryId?: string,
    startDate?: string,
    endDate?: string,
    filterYear?: number,
    filterMonth?: number,
  ): Promise<{
    total: Decimal;
    count: number;
    budgetAmount?: Decimal;
    budgetPeriod?: string;
    budgetSource?: 'subcategory' | 'category';
  }> {
    const where: any = { userId, deletedAt: null };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (subcategoryId) {
      where.subcategoryId = subcategoryId;
    }

    const dateOr: any[] = [];
    if (startDate || endDate) {
      const cond: any = {};
      if (startDate) cond.gte = new Date(startDate);
      if (endDate) cond.lte = new Date(endDate);
      dateOr.push({ date: cond });
    }
    if (filterYear) {
      const y = filterYear;
      const m = filterMonth ? filterMonth - 1 : undefined;
      const from = m !== undefined ? new Date(y, m, 1) : new Date(y, 0, 1);
      const to = m !== undefined ? new Date(y, m + 1, 0) : new Date(y, 11, 31);
      dateOr.push({ date: { gte: from, lte: to } });
    }
    if (dateOr.length === 1) {
      where.date = dateOr[0].date;
    } else if (dateOr.length > 1) {
      where.OR = dateOr;
    }

    const expenses = await this.prisma.expense.findMany({ where, select: { amount: true } });

    // Use Decimal arithmetic for precise calculations
    const total = expenses.reduce((sum, expense) => sum.add(expense.amount), new Decimal(0));

    // Fetch budget info: subcategory takes precedence over category
    let budgetAmount: Decimal | undefined;
    let budgetPeriod: string | undefined;
    let budgetSource: 'subcategory' | 'category' | undefined;

    if (subcategoryId) {
      const subcategory = await this.prisma.subcategory.findUnique({
        where: { id: subcategoryId },
        select: { budgetAmount: true, budgetPeriod: true },
      });
      if (subcategory?.budgetAmount) {
        budgetAmount = subcategory.budgetAmount;
        budgetPeriod = subcategory.budgetPeriod ?? undefined;
        budgetSource = 'subcategory';
      }
    }

    if (!budgetAmount && categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { budgetAmount: true, budgetPeriod: true },
      });
      if (category?.budgetAmount) {
        budgetAmount = category.budgetAmount;
        budgetPeriod = category.budgetPeriod ?? undefined;
        budgetSource = 'category';
      }
    }

    return { total, count: expenses.length, budgetAmount, budgetPeriod, budgetSource };
  }

  /**
   * Bulk create expenses with duplicate detection
   * Accepts category and subcategory names, resolves to IDs
   * @param userId - User ID
   * @param expenses - Array of expense DTOs with category/subcategory names
   * @returns Object with created, duplicate, and failed expenses
   */
  async bulkCreate(
    userId: string,
    expenses: any[],
  ): Promise<{
    created: any[];
    duplicates: Array<{ index: number; expense: any; reason: string }>;
    failed: Array<{ index: number; expense: any; error: string }>;
    summary: { total: number; created: number; duplicates: number; failed: number };
  }> {
    const created: any[] = [];
    const duplicates: Array<{ index: number; expense: any; reason: string }> = [];
    const failed: Array<{ index: number; expense: any; error: string }> = [];

    // Process each expense
    for (let i = 0; i < expenses.length; i++) {
      const expenseDto = expenses[i];

      try {
        // Resolve category name to ID
        const category = await this.prisma.category.findFirst({
          where: {
            name: expenseDto.categoryName,
            OR: [{ userId }, { type: 'predefined' }],
            deletedAt: null,
          },
        });

        if (!category) {
          failed.push({
            index: i,
            expense: expenseDto,
            error: `Category '${expenseDto.categoryName}' not found`,
          });
          continue;
        }

        let subcategoryId: string | null = null;

        // Resolve subcategory name to ID if provided
        if (expenseDto.subcategoryName) {
          const subcategory = await this.prisma.subcategory.findFirst({
            where: {
              name: expenseDto.subcategoryName,
              categoryId: category.id,
            },
          });

          if (!subcategory) {
            failed.push({
              index: i,
              expense: expenseDto,
              error: `Subcategory '${expenseDto.subcategoryName}' not found under category '${expenseDto.categoryName}'`,
            });
            continue;
          }

          subcategoryId = subcategory.id;
        }

        // Check for duplicate: same userId, amount, date, and description
        const existingExpense = await this.prisma.expense.findFirst({
          where: {
            userId,
            amount: new Decimal(expenseDto.amount),
            date: new Date(expenseDto.date),
            description: expenseDto.description || null,
            deletedAt: null,
          },
        });

        if (existingExpense) {
          duplicates.push({
            index: i,
            expense: expenseDto,
            reason: 'Duplicate expense: same amount, date, and description already exists',
          });
          continue;
        }

        // Create the expense
        // Note: DB has CHECK constraints:
        // - source='imported' requires importSessionId
        // - source='api' requires connectionId
        // The bulk API has neither context, so always persist as 'manual'.
        const effectiveSource = 'manual';
        const expense = await this.prisma.expense.create({
          data: {
            userId,
            categoryId: category.id,
            subcategoryId,
            amount: new Decimal(expenseDto.amount),
            date: new Date(expenseDto.date),
            description: expenseDto.description || null,
            source: effectiveSource,
            status: 'confirmed',
          },
          include: {
            category: true,
            subcategory: true,
          },
        });

        created.push(expense);
      } catch (error) {
        failed.push({
          index: i,
          expense: expenseDto,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      created,
      duplicates,
      failed,
      summary: {
        total: expenses.length,
        created: created.length,
        duplicates: duplicates.length,
        failed: failed.length,
      },
    };
  }
}
