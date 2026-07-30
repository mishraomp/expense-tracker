import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request body for updating a category. All fields are optional; omitting a
 * field leaves it unchanged. For type:'predefined' categories, changing name
 * or icon throws 403 — only colorCode and the budget fields are editable on
 * predefined categories.
 */
export class UpdateCategoryDto {
  /**
   * New category name. Rejected with 403 for predefined categories.
   * Uniqueness is case-insensitive, checked only against the caller's OTHER
   * custom categories (a custom category CAN duplicate a predefined name).
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * New display color for the category. Editable even on predefined
   * categories.
   */
  @IsOptional()
  @IsString()
  colorCode?: string;

  /**
   * New icon identifier. Rejected with 403 for predefined categories.
   */
  @IsOptional()
  @IsString()
  icon?: string;

  /**
   * Budget amount, as a decimal number or numeric string. Tri-state: OMIT to
   * leave the existing budget unchanged; set explicitly to null to REMOVE
   * the budget; set to a value to create/replace it using the
   * budgetPeriod/budgetStartDate/budgetEndDate precedence described on
   * CreateCategoryDto.
   */
  @ApiPropertyOptional({ oneOf: [{ type: 'string' }, { type: 'number' }], nullable: true })
  @IsOptional()
  budgetAmount?: string | number | null;

  /**
   * Budget period: 'monthly' or 'annual'. Only consulted when budgetAmount
   * is also being set to a value.
   */
  @ApiPropertyOptional({ enum: ['monthly', 'annual'], nullable: true })
  @IsOptional()
  @IsEnum(['monthly', 'annual'] as any)
  budgetPeriod?: 'monthly' | 'annual' | null;

  /**
   * Explicit budget period start date (YYYY-MM-DD). Takes precedence over
   * budgetPeriod when both budgetStartDate and budgetEndDate are provided.
   */
  @IsOptional()
  @IsDateString()
  budgetStartDate?: string | null;

  /**
   * Explicit budget period end date (YYYY-MM-DD). Takes precedence over
   * budgetPeriod when both budgetStartDate and budgetEndDate are provided.
   */
  @IsOptional()
  @IsDateString()
  budgetEndDate?: string | null;
}
