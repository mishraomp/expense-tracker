import { Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { IncomeSource, IncomeFrequency } from '@prisma/client';

export class IncomeListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(3000)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(IncomeSource)
  source?: IncomeSource;

  @IsOptional()
  @IsEnum(IncomeFrequency)
  frequency?: IncomeFrequency;

  @IsOptional()
  @IsString()
  employer?: string;
}
