import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExpenseSource {
  MANUAL = 'manual',
  IMPORTED = 'imported',
  API = 'api',
}

export enum RecurrenceFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export class CreateExpenseDto {
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Type(() => Number)
  amount: number;

  @IsNotEmpty({ message: 'Category is required' })
  @IsUUID('4', { message: 'Category must be a valid UUID' })
  categoryId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Subcategory must be a valid UUID' })
  subcategoryId?: string;

  @IsNotEmpty({ message: 'Date is required' })
  @IsDateString({}, { message: 'Date must be a valid date' })
  date: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsEnum(ExpenseSource, { message: 'Invalid expense source' })
  source?: ExpenseSource;

  @IsOptional()
  @IsBoolean({ message: 'Recurring must be a boolean' })
  recurring?: boolean;

  @ValidateIf((o) => o.recurring === true)
  @IsNotEmpty({ message: 'Recurrence frequency is required when recurring is enabled' })
  @IsEnum(RecurrenceFrequency, { message: 'Invalid recurrence frequency' })
  recurrenceFrequency?: RecurrenceFrequency;

  @ValidateIf((o) => o.recurring === true)
  @IsNotEmpty({ message: 'Number of recurrences is required when recurring is enabled' })
  @IsInt({ message: 'Number of recurrences must be an integer' })
  @Min(1, { message: 'Number of recurrences must be at least 1' })
  @Max(365, { message: 'Number of recurrences cannot exceed 365' })
  @Type(() => Number)
  numberOfRecurrences?: number;
}
