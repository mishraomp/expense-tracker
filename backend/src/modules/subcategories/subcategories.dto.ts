import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type BudgetPeriod = 'monthly' | 'annual';

export class CreateSubcategoryDto {
  /**
   * Max 100 chars.
   */
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  /**
   * Parent category UUID; must exist.
   */
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  /**
   * Decimal amount as a string.
   */
  @IsOptional()
  @IsString()
  budgetAmount?: string;

  /**
   * 'monthly' or 'annual'.
   */
  @ApiPropertyOptional({ enum: ['monthly', 'annual'] })
  @IsOptional()
  @IsEnum(['monthly', 'annual'] as any)
  budgetPeriod?: BudgetPeriod;

  /**
   * YYYY-MM-DD. Explicit dates take precedence over budgetPeriod when both
   * are present.
   */
  @IsOptional()
  @IsDateString()
  budgetStartDate?: string;

  /**
   * YYYY-MM-DD. Explicit dates take precedence over budgetPeriod when both
   * are present.
   */
  @IsOptional()
  @IsDateString()
  budgetEndDate?: string;
}

export class UpdateSubcategoryDto {
  /**
   * Max 100 chars.
   */
  @ValidateIf((o) => o.name !== undefined)
  @IsString()
  @MaxLength(100)
  name?: string;

  /**
   * Parent category UUID; must exist. Setting this moves the subcategory to
   * a different category.
   */
  @ValidateIf((o) => o.categoryId !== undefined)
  @IsUUID()
  categoryId?: string;

  /**
   * Decimal amount as a string. Set to null to remove the budget; omit to
   * leave unchanged.
   */
  @IsOptional()
  @IsString()
  budgetAmount?: string | null;

  /**
   * 'monthly' or 'annual'.
   */
  @ApiPropertyOptional({ enum: ['monthly', 'annual'], nullable: true })
  @IsOptional()
  @IsEnum(['monthly', 'annual'] as any)
  budgetPeriod?: BudgetPeriod | null;

  /**
   * YYYY-MM-DD. Explicit dates take precedence over budgetPeriod when both
   * are present.
   */
  @IsOptional()
  @IsDateString()
  budgetStartDate?: string | null;

  /**
   * YYYY-MM-DD. Explicit dates take precedence over budgetPeriod when both
   * are present.
   */
  @IsOptional()
  @IsDateString()
  budgetEndDate?: string | null;
}

export class SubcategoryQueryDto {
  /**
   * Optional parent category UUID filter. Omit to list subcategories across
   * all categories.
   */
  @ValidateIf((o) => o.categoryId !== undefined)
  @IsUUID()
  categoryId?: string;
}
