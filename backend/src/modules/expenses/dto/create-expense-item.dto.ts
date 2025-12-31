import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating an individual expense item within an expense transaction.
 * Enables split receipts across different categories (e.g., Costco → Clothing → tshirt).
 */
export class CreateExpenseItemDto {
  @IsNotEmpty({ message: 'Item name is required' })
  @IsString({ message: 'Item name must be a string' })
  @MaxLength(200, { message: 'Item name cannot exceed 200 characters' })
  name: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsUUID('4', { message: 'Category must be a valid UUID' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Subcategory must be a valid UUID' })
  subcategoryId?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;

  @IsOptional()
  @IsBoolean({ message: 'GST applicability must be a boolean' })
  @Type(() => Boolean)
  gstApplicable?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'PST applicability must be a boolean' })
  @Type(() => Boolean)
  pstApplicable?: boolean;
}
