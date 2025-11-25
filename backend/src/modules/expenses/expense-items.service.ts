import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseItemDto } from './dto/create-expense-item.dto';
import { UpdateExpenseItemDto } from './dto/update-expense-item.dto';
import { ExpenseItemResponseDto, ExpenseItemListResponseDto } from './dto/expense-item-response.dto';
import { Decimal } from '@prisma/client/runtime/client.js';

/**
 * Service for managing expense items (line items within an expense).
 * Enables split receipts across different categories.
 */
@Injectable()
export class ExpenseItemsService {
  /** Maximum items allowed per expense (enforced at DB level too) */
  private readonly MAX_ITEMS_PER_EXPENSE = 100;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new expense item.
   * @param userId - User ID (for authorization)
   * @param expenseId - Parent expense ID
   * @param createDto - Item data
   * @returns Created item with relations
   */
  async create(
    userId: string,
    expenseId: string,
    createDto: CreateExpenseItemDto,
  ): Promise<ExpenseItemResponseDto> {
    // Verify expense exists and belongs to user
    await this.verifyExpenseOwnership(userId, expenseId);

    // Validate subcategory belongs to category if both provided
    if (createDto.categoryId && createDto.subcategoryId) {
      await this.validateSubcategoryCategory(createDto.categoryId, createDto.subcategoryId);
    }

    // Check item count limit
    const currentCount = await this.prisma.expenseItem.count({
      where: { expenseId, deletedAt: null },
    });
    if (currentCount >= this.MAX_ITEMS_PER_EXPENSE) {
      throw new BadRequestException(
        `Cannot add more than ${this.MAX_ITEMS_PER_EXPENSE} items per expense`,
      );
    }

    const item = await this.prisma.expenseItem.create({
      data: {
        expenseId,
        name: createDto.name.trim(),
        amount: new Decimal(createDto.amount),
        categoryId: createDto.categoryId,
        subcategoryId: createDto.subcategoryId,
        notes: createDto.notes?.trim(),
      },
      include: { category: true, subcategory: true },
    });

    return ExpenseItemResponseDto.fromEntity(item);
  }

  /**
   * Create multiple expense items in a single transaction.
   * @param userId - User ID (for authorization)
   * @param expenseId - Parent expense ID
   * @param items - Array of item data
   * @returns Created items with relations
   */
  async bulkCreate(
    userId: string,
    expenseId: string,
    items: CreateExpenseItemDto[],
  ): Promise<ExpenseItemResponseDto[]> {
    // Verify expense exists and belongs to user
    await this.verifyExpenseOwnership(userId, expenseId);

    // Check combined limit
    const currentCount = await this.prisma.expenseItem.count({
      where: { expenseId, deletedAt: null },
    });
    if (currentCount + items.length > this.MAX_ITEMS_PER_EXPENSE) {
      throw new BadRequestException(
        `Cannot add ${items.length} items. Maximum ${this.MAX_ITEMS_PER_EXPENSE} items per expense (${currentCount} existing).`,
      );
    }

    // Validate all subcategory-category pairs upfront
    for (const dto of items) {
      if (dto.categoryId && dto.subcategoryId) {
        await this.validateSubcategoryCategory(dto.categoryId, dto.subcategoryId);
      }
    }

    // Create all items in transaction
    const createdItems = await this.prisma.$transaction(
      items.map((dto) =>
        this.prisma.expenseItem.create({
          data: {
            expenseId,
            name: dto.name.trim(),
            amount: new Decimal(dto.amount),
            categoryId: dto.categoryId,
            subcategoryId: dto.subcategoryId,
            notes: dto.notes?.trim(),
          },
          include: { category: true, subcategory: true },
        }),
      ),
    );

    return createdItems.map((item) => ExpenseItemResponseDto.fromEntity(item));
  }

  /**
   * List all items for an expense.
   * @param userId - User ID (for authorization)
   * @param expenseId - Parent expense ID
   * @returns List of items with summary
   */
  async findAll(userId: string, expenseId: string): Promise<ExpenseItemListResponseDto> {
    // Verify expense exists and belongs to user
    await this.verifyExpenseOwnership(userId, expenseId);

    const items = await this.prisma.expenseItem.findMany({
      where: { expenseId, deletedAt: null },
      include: { category: true, subcategory: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalAmount = items.reduce((sum, item) => sum.add(item.amount), new Decimal(0));

    return {
      data: items.map((item) => ExpenseItemResponseDto.fromEntity(item)),
      summary: {
        totalAmount: totalAmount.toNumber(),
        count: items.length,
      },
    };
  }

  /**
   * Get a single expense item.
   * @param userId - User ID (for authorization)
   * @param expenseId - Parent expense ID
   * @param itemId - Item ID
   * @returns Item with relations
   */
  async findOne(userId: string, expenseId: string, itemId: string): Promise<ExpenseItemResponseDto> {
    // Verify expense exists and belongs to user
    await this.verifyExpenseOwnership(userId, expenseId);

    const item = await this.prisma.expenseItem.findFirst({
      where: { id: itemId, expenseId, deletedAt: null },
      include: { category: true, subcategory: true },
    });

    if (!item) {
      throw new NotFoundException(`Expense item with ID ${itemId} not found`);
    }

    return ExpenseItemResponseDto.fromEntity(item);
  }

  /**
   * Update an expense item.
   * @param userId - User ID (for authorization)
   * @param expenseId - Parent expense ID
   * @param itemId - Item ID
   * @param updateDto - Fields to update
   * @returns Updated item with relations
   */
  async update(
    userId: string,
    expenseId: string,
    itemId: string,
    updateDto: UpdateExpenseItemDto,
  ): Promise<ExpenseItemResponseDto> {
    // Verify expense exists and belongs to user
    await this.verifyExpenseOwnership(userId, expenseId);

    // Verify item exists
    const existing = await this.prisma.expenseItem.findFirst({
      where: { id: itemId, expenseId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Expense item with ID ${itemId} not found`);
    }

    // Validate subcategory-category if updating either
    const newCategoryId = updateDto.categoryId ?? existing.categoryId;
    const newSubcategoryId = updateDto.subcategoryId ?? existing.subcategoryId;
    if (newCategoryId && newSubcategoryId) {
      await this.validateSubcategoryCategory(newCategoryId, newSubcategoryId);
    }

    // Build update data
    const data: any = {};
    if (updateDto.name !== undefined) {
      data.name = updateDto.name.trim();
    }
    if (updateDto.amount !== undefined) {
      if (updateDto.amount <= 0) {
        throw new BadRequestException('Amount must be positive');
      }
      data.amount = new Decimal(updateDto.amount);
    }
    if (updateDto.categoryId !== undefined) {
      data.categoryId = updateDto.categoryId;
    }
    if (updateDto.subcategoryId !== undefined) {
      data.subcategoryId = updateDto.subcategoryId;
    }
    if (updateDto.notes !== undefined) {
      data.notes = updateDto.notes?.trim() || null;
    }

    const item = await this.prisma.expenseItem.update({
      where: { id: itemId },
      data,
      include: { category: true, subcategory: true },
    });

    return ExpenseItemResponseDto.fromEntity(item);
  }

  /**
   * Delete (soft) an expense item.
   * @param userId - User ID (for authorization)
   * @param expenseId - Parent expense ID
   * @param itemId - Item ID
   */
  async remove(userId: string, expenseId: string, itemId: string): Promise<void> {
    // Verify expense exists and belongs to user
    await this.verifyExpenseOwnership(userId, expenseId);

    // Verify item exists
    const existing = await this.prisma.expenseItem.findFirst({
      where: { id: itemId, expenseId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Expense item with ID ${itemId} not found`);
    }

    // Soft delete
    await this.prisma.expenseItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Delete all items for an expense (soft delete).
   * @param userId - User ID (for authorization)
   * @param expenseId - Parent expense ID
   */
  async removeAll(userId: string, expenseId: string): Promise<void> {
    // Verify expense exists and belongs to user
    await this.verifyExpenseOwnership(userId, expenseId);

    // Soft delete all items
    await this.prisma.expenseItem.updateMany({
      where: { expenseId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Verify that expense exists and belongs to user.
   * @throws NotFoundException if expense not found
   * @throws ForbiddenException if expense belongs to different user
   */
  private async verifyExpenseOwnership(userId: string, expenseId: string): Promise<void> {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      select: { userId: true, deletedAt: true },
    });

    if (!expense || expense.deletedAt) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found`);
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException('You do not have access to this expense');
    }
  }

  /**
   * Validate that subcategory belongs to category.
   * @throws BadRequestException if validation fails
   */
  private async validateSubcategoryCategory(
    categoryId: string,
    subcategoryId: string,
  ): Promise<void> {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id: subcategoryId },
      select: { categoryId: true },
    });

    if (!subcategory) {
      throw new BadRequestException(`Subcategory with ID ${subcategoryId} not found`);
    }

    if (subcategory.categoryId !== categoryId) {
      throw new BadRequestException('Subcategory does not belong to the specified category');
    }
  }
}
