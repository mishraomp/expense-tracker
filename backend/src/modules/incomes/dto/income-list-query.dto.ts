import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { IncomeSource, IncomeFrequency } from '@prisma/client';

export class IncomeListQueryDto {
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
