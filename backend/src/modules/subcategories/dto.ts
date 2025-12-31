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

export type BudgetPeriod = 'monthly' | 'annual';

export class CreateSubcategoryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  budgetAmount?: string;

  @IsOptional()
  @IsEnum(['monthly', 'annual'] as any)
  budgetPeriod?: BudgetPeriod;

  @IsOptional()
  @IsDateString()
  budgetStartDate?: string;

  @IsOptional()
  @IsDateString()
  budgetEndDate?: string;
}

export class UpdateSubcategoryDto {
  @ValidateIf((o) => o.name !== undefined)
  @IsString()
  @MaxLength(100)
  name?: string;

  @ValidateIf((o) => o.categoryId !== undefined)
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  budgetAmount?: string | null;

  @IsOptional()
  @IsEnum(['monthly', 'annual'] as any)
  budgetPeriod?: BudgetPeriod | null;

  @IsOptional()
  @IsDateString()
  budgetStartDate?: string | null;

  @IsOptional()
  @IsDateString()
  budgetEndDate?: string | null;
}

export class SubcategoryQueryDto {
  @ValidateIf((o) => o.categoryId !== undefined)
  @IsUUID()
  categoryId?: string;
}
