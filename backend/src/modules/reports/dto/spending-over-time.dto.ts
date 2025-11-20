import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class SpendingOverTimeQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsEnum({ day: 'day', week: 'week', month: 'month' })
  interval!: 'day' | 'week' | 'month';

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;
}

export interface SpendingOverTimePointDto {
  bucket: string; // YYYY-MM-DD
  amount: string; // decimal string
}

export interface SpendingOverTimeResponseDto {
  data: SpendingOverTimePointDto[];
  meta: { interval: 'day' | 'week' | 'month' };
}
