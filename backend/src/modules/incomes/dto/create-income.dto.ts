import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { IncomeSource, IncomeFrequency } from '@prisma/client';

export class CreateIncomeDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsEnum(IncomeSource)
  @IsNotEmpty()
  source: IncomeSource;

  @IsEnum(IncomeFrequency)
  @IsNotEmpty()
  frequency: IncomeFrequency;

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
