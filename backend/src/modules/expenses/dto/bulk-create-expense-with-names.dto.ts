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
  /**
   * Pre-tax subtotal (currency is implicitly CAD). GST/PST are computed additively on top of this.
   */
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Type(() => Number)
  amount: number;

  /**
   * Exact category name, matched against your own categories or predefined categories. An unmatched name does not fail the whole batch — that row is reported in failed[] and the rest still process.
   */
  @IsNotEmpty({ message: 'Category name is required' })
  @IsString({ message: 'Category name must be a string' })
  @MaxLength(100, { message: 'Category name cannot exceed 100 characters' })
  categoryName: string;

  /**
   * Exact subcategory name, matched against your own categories or predefined categories. An unmatched name does not fail the whole batch — that row is reported in failed[] and the rest still process.
   */
  @IsOptional()
  @IsString({ message: 'Subcategory name must be a string' })
  @MaxLength(100, { message: 'Subcategory name cannot exceed 100 characters' })
  subcategoryName?: string;

  /**
   * Expense date, ISO 8601 (YYYY-MM-DD).
   */
  @IsNotEmpty({ message: 'Date is required' })
  @IsDateString({}, { message: 'Date must be a valid date' })
  date: string;

  /**
   * Optional free-text note, max 500 characters.
   */
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  /**
   * Ignored — bulk-imported expenses are always stored with source='manual' regardless of what's sent here.
   */
  @IsOptional()
  @IsEnum(ExpenseSource, { message: 'Invalid expense source' })
  source?: ExpenseSource;
}
