import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { IncomeSource, IncomeFrequency } from '@prisma/client';

export class UpdateIncomeDto {
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsEnum(IncomeSource)
  @IsOptional()
  source?: IncomeSource;

  @IsEnum(IncomeFrequency)
  @IsOptional()
  frequency?: IncomeFrequency;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  employer?: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  numberOfRecurrences?: number;
}
