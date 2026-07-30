import { Transform } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class SpendingByCategoryTagsQueryDto {
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
   * Optional category UUID to match. At least one of categoryId/tagIds is
   * required; when both are given, matching is OR (see controller notes).
   */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /**
   * Optional tag UUIDs to match. At least one of categoryId/tagIds is
   * required; when both are given, matching is OR (see controller notes).
   * Accepts EITHER a single comma-separated string (e.g. "id1,id2,id3") OR a
   * repeated array query parameter (e.g. tagIds=id1&tagIds=id2) — the
   * @Transform on this field normalizes both forms into a string array.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

/**
 * A tag attached to an expense (or one of its line items) in a
 * spending-by-category-tags result row.
 */
export class SpendingByCategoryTagsExpenseTagDto {
  /**
   * Tag UUID.
   */
  id: string;

  /**
   * Tag name.
   */
  name: string;

  /**
   * Tag display color, if any.
   */
  colorCode: string | null;
}

/**
 * One expense row in a spending-by-category-tags result.
 */
export class SpendingByCategoryTagsExpenseDto {
  /**
   * Expense UUID.
   */
  id: string;

  /**
   * Owning user's UUID.
   */
  userId: string;

  /**
   * Expense's own category UUID.
   */
  categoryId: string;

  /**
   * Expense's own subcategory UUID, if any.
   */
  subcategoryId: string | null;

  /**
   * Expense amount.
   */
  amount: number;

  /**
   * Expense date, YYYY-MM-DD.
   */
  date: string;

  /**
   * Free-text description, if any.
   */
  description: string | null;

  /**
   * Expense source.
   */
  source: string;

  /**
   * Expense status.
   */
  status: string;

  /**
   * Merchant name, if any.
   */
  merchantName: string | null;

  /**
   * Row creation timestamp.
   */
  createdAt: Date;

  /**
   * Row last-updated timestamp.
   */
  updatedAt: Date;

  /**
   * The expense's own category, if resolvable.
   */
  category?: {
    id: string;
    name: string;
    type: string;
    colorCode: string | null;
    icon: string | null;
  };

  /**
   * The expense's own subcategory, if any.
   */
  subcategory?: { id: string; name: string };

  /**
   * Tags matched on the expense itself or on any of its line items.
   */
  tags?: SpendingByCategoryTagsExpenseTagDto[];
}

/**
 * Response for the spending-by-category-tags report.
 */
export class SpendingByCategoryTagsResponseDto {
  /**
   * Matching expense rows.
   */
  data: SpendingByCategoryTagsExpenseDto[];

  /**
   * Aggregate summary across data.
   */
  summary: {
    totalAmount: number;
    count: number;
  };
}
