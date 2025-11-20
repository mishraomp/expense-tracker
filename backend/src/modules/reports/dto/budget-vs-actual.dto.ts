import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class BudgetVsActualQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;
}

export interface BudgetVsActualPointDto {
  bucket: string; // YYYY-MM-DD, first of month
  budgetAmount: string; // decimal string
  actualAmount: string; // decimal string
}
