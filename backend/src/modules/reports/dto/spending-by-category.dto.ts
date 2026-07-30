import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class SpendingByCategoryQueryDto {
  /**
   * YYYY-MM-DD, inclusive start of the range.
   */
  @IsDateString()
  startDate!: string;

  /**
   * YYYY-MM-DD, inclusive end of the range.
   */
  @IsDateString()
  endDate!: string;

  /**
   * Restrict to a single category UUID.
   */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /**
   * Restrict to a single subcategory UUID.
   */
  @IsOptional()
  @IsUUID()
  subcategoryId?: string;
}

/**
 * One category's total spending within the requested range.
 */
export class CategoryBreakdownItemDto {
  /**
   * Category UUID.
   */
  categoryId: string;

  /**
   * Category name.
   */
  categoryName: string;

  /**
   * Category display color, if any.
   */
  colorCode: string | null;

  /**
   * Total amount spent in this category, as a decimal string.
   */
  amount: string;
}
