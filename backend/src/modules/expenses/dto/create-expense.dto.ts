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
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateExpenseItemDto } from './create-expense-item.dto';

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
  /**
   * Pre-tax subtotal (currency is implicitly CAD). GST/PST are computed additively on top of this.
   */
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Type(() => Number)
  amount: number;

  /**
   * Category UUID.
   */
  @IsNotEmpty({ message: 'Category is required' })
  @IsUUID('4', { message: 'Category must be a valid UUID' })
  categoryId: string;

  /**
   * Optional subcategory UUID.
   */
  @IsOptional()
  @IsUUID('4', { message: 'Subcategory must be a valid UUID' })
  subcategoryId?: string;

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
   * Where this expense originated. Defaults to 'manual' when omitted.
   */
  @IsOptional()
  @IsEnum(ExpenseSource, { message: 'Invalid expense source' })
  source?: ExpenseSource;

  /**
   * When true, requires recurrenceFrequency and numberOfRecurrences, and generates a series of expenses instead of one (see the create endpoint's notes).
   */
  @IsOptional()
  @IsBoolean({ message: 'Recurring must be a boolean' })
  recurring?: boolean;

  /**
   * Required only when recurring=true.
   */
  @ValidateIf((o) => o.recurring === true)
  @IsNotEmpty({ message: 'Recurrence frequency is required when recurring is enabled' })
  @IsEnum(RecurrenceFrequency, { message: 'Invalid recurrence frequency' })
  recurrenceFrequency?: RecurrenceFrequency;

  /**
   * Required only when recurring=true. 1-365.
   */
  @ValidateIf((o) => o.recurring === true)
  @IsNotEmpty({ message: 'Number of recurrences is required when recurring is enabled' })
  @IsInt({ message: 'Number of recurrences must be an integer' })
  @Min(1, { message: 'Number of recurrences must be at least 1' })
  @Max(365, { message: 'Number of recurrences cannot exceed 365' })
  @Type(() => Number)
  numberOfRecurrences?: number;

  /**
   * Optional line items. Their amounts are NOT validated against the parent amount on this endpoint (unlike the standalone /expenses/:id/items endpoints, which do enforce sum(items) <= amount). Per-item gstApplicable/pstApplicable override the parent's when set.
   */
  @IsOptional()
  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @ArrayMaxSize(100, { message: 'Cannot add more than 100 items per expense' })
  @Type(() => CreateExpenseItemDto)
  items?: CreateExpenseItemDto[];

  /**
   * Optional tag UUIDs, max 10.
   */
  @IsOptional()
  @IsArray({ message: 'Tag IDs must be an array' })
  @IsUUID('4', { each: true, message: 'Each tag ID must be a valid UUID' })
  @ArrayMaxSize(10, { message: 'Cannot add more than 10 tags per expense' })
  tagIds?: string[];

  /**
   * Whether GST applies — used to compute gstAmount server-side.
   */
  @IsOptional()
  @IsBoolean({ message: 'GST applicability must be a boolean' })
  @Type(() => Boolean)
  gstApplicable?: boolean;

  /**
   * Whether PST applies — used to compute pstAmount server-side.
   */
  @IsOptional()
  @IsBoolean({ message: 'PST applicability must be a boolean' })
  @Type(() => Boolean)
  pstApplicable?: boolean;
}
