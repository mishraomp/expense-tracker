import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class BudgetVsActualQueryDto {
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
 * One monthly data point comparing budget vs. actual spending.
 */
export class BudgetVsActualPointDto {
  /**
   * First-of-month bucket date, YYYY-MM-DD.
   */
  bucket: string;

  /**
   * Monthly-equivalent budget figure for this bucket, as a decimal string
   * (annual budgets are normalized to /12; subcategory budgets take
   * precedence over category budgets — see controller notes).
   */
  budgetAmount: string;

  /**
   * Actual spending for this bucket, as a decimal string.
   */
  actualAmount: string;
}
