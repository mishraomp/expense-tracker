import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating an individual expense item within an expense transaction.
 * Enables split receipts across different categories (e.g., Costco → Clothing → tshirt).
 */
export class CreateExpenseItemDto {
  /**
   * Item name/description, max 200 characters.
   */
  @IsNotEmpty({ message: 'Item name is required' })
  @IsString({ message: 'Item name must be a string' })
  @MaxLength(200, { message: 'Item name cannot exceed 200 characters' })
  name: string;

  /**
   * Item amount. When this DTO is used via the standalone /expenses/:expenseId/items endpoints, the sum of all items must not exceed the parent expense's amount (400 if exceeded) — this is NOT enforced when items are embedded inline inside POST /expenses.
   */
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Type(() => Number)
  amount: number;

  /**
   * Optional category UUID for this item, independent of the parent expense's category.
   */
  @IsOptional()
  @IsUUID('4', { message: 'Category must be a valid UUID' })
  categoryId?: string;

  /**
   * Optional subcategory UUID for this item. Must belong to categoryId when both are set.
   */
  @IsOptional()
  @IsUUID('4', { message: 'Subcategory must be a valid UUID' })
  subcategoryId?: string;

  /**
   * Optional free-text note, max 500 characters.
   */
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;

  /**
   * Whether GST applies to this item. Only honored when this item is embedded inside CreateExpenseDto.items on POST /expenses — silently ignored when posted through the standalone /expenses/:expenseId/items or .../items/bulk endpoints.
   */
  @IsOptional()
  @IsBoolean({ message: 'GST applicability must be a boolean' })
  @Type(() => Boolean)
  gstApplicable?: boolean;

  /**
   * Whether PST applies to this item. Only honored when this item is embedded inside CreateExpenseDto.items on POST /expenses — silently ignored when posted through the standalone /expenses/:expenseId/items or .../items/bulk endpoints.
   */
  @IsOptional()
  @IsBoolean({ message: 'PST applicability must be a boolean' })
  @Type(() => Boolean)
  pstApplicable?: boolean;
}
