import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request body for creating a category. This always creates a type:'custom'
 * category scoped to the calling user — predefined categories cannot be
 * created via this endpoint.
 */
export class CreateCategoryDto {
  /**
   * Category name. Uniqueness is case-insensitive but is only checked
   * against the caller's OTHER custom categories — a custom category CAN
   * duplicate a predefined category's name.
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Optional display color for the category.
   */
  @IsOptional()
  @IsString()
  colorCode?: string;

  /**
   * Optional icon identifier for the category.
   */
  @IsOptional()
  @IsString()
  icon?: string;

  /**
   * Budget amount for this category, as a decimal number or numeric string.
   * Precedence with budgetPeriod/budgetStartDate/budgetEndDate: explicit
   * budgetStartDate+budgetEndDate win; else budgetPeriod ('monthly' |
   * 'annual') computes the CURRENT calendar month/year; else budgetAmount
   * alone falls back to a wide recurring range.
   */
  @ApiPropertyOptional({ oneOf: [{ type: 'string' }, { type: 'number' }] })
  @IsOptional()
  budgetAmount?: string | number;

  /**
   * Budget period: 'monthly' or 'annual'. Used to compute the budget's date
   * range (current calendar month/year) when explicit start/end dates are
   * not provided. See budgetAmount for the full precedence rules.
   */
  @ApiPropertyOptional({ enum: ['monthly', 'annual'] })
  @IsOptional()
  @IsEnum(['monthly', 'annual'] as any)
  budgetPeriod?: 'monthly' | 'annual';

  /**
   * Explicit budget period start date (YYYY-MM-DD). Takes precedence over
   * budgetPeriod when both budgetStartDate and budgetEndDate are provided.
   */
  @IsOptional()
  @IsDateString()
  budgetStartDate?: string;

  /**
   * Explicit budget period end date (YYYY-MM-DD). Takes precedence over
   * budgetPeriod when both budgetStartDate and budgetEndDate are provided.
   */
  @IsOptional()
  @IsDateString()
  budgetEndDate?: string;
}
