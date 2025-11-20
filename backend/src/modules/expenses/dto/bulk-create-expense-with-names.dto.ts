import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExpenseSource {
  MANUAL = 'manual',
  IMPORTED = 'imported',
  API = 'api',
}

export class CreateExpenseWithNamesDto {
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Type(() => Number)
  amount: number;

  @IsNotEmpty({ message: 'Category name is required' })
  @IsString({ message: 'Category name must be a string' })
  @MaxLength(100, { message: 'Category name cannot exceed 100 characters' })
  categoryName: string;

  @IsOptional()
  @IsString({ message: 'Subcategory name must be a string' })
  @MaxLength(100, { message: 'Subcategory name cannot exceed 100 characters' })
  subcategoryName?: string;

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
}
