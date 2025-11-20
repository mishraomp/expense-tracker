import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class SpendingByCategoryQueryDto {
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

export interface CategoryBreakdownItemDto {
  categoryId: string;
  categoryName: string;
  colorCode: string | null;
  amount: string; // decimal string
}
