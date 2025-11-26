import { IsOptional, IsInt, Min, Max, IsUUID, IsDateString, IsEnum, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ExpenseListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page size must be an integer' })
  @Min(1, { message: 'Page size must be at least 1' })
  @Max(100, { message: 'Page size cannot exceed 100' })
  pageSize?: number = 20;

  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Subcategory ID must be a valid UUID' })
  subcategoryId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date' })
  endDate?: string;

  @IsOptional()
  @IsEnum(SortOrder, { message: 'Sort order must be asc or desc' })
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  sortBy?: string = 'date';

  // Additional optional year/month filters (OR-ed with start/end range)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'filterYear must be an integer year' })
  @Min(1900)
  @Max(2100)
  filterYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'filterMonth must be an integer' })
  @Min(1)
  @Max(12)
  filterMonth?: number; // Ignored if filterYear is not provided

  @IsOptional()
  @IsString({ message: 'Item name must be a string' })
  @MaxLength(255, { message: 'Item name cannot exceed 255 characters' })
  itemName?: string; // Filter expenses that have items containing this name
}
