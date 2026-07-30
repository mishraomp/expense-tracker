import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsDateString,
  IsEnum,
  IsString,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ExpenseListQueryDto {
  /**
   * Page number, 1-indexed. Defaults to 1.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  /**
   * Results per page, 1-100. Defaults to 20.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page size must be an integer' })
  @Min(1, { message: 'Page size must be at least 1' })
  @Max(100, { message: 'Page size cannot exceed 100' })
  pageSize?: number = 20;

  /**
   * Filter to a single category UUID.
   */
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  /**
   * Filter to a single subcategory UUID.
   */
  @IsOptional()
  @IsUUID('4', { message: 'Subcategory ID must be a valid UUID' })
  subcategoryId?: string;

  /**
   * Inclusive lower bound on expense date (ISO 8601).
   */
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date' })
  startDate?: string;

  /**
   * Inclusive upper bound on expense date (ISO 8601).
   */
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date' })
  endDate?: string;

  /**
   * Comma-separated list, paired positionally with sortBy.
   */
  @IsOptional()
  @IsArray({ message: 'Sort order must be an array' })
  @IsEnum(SortOrder, { each: true, message: 'Each sort order must be asc or desc' })
  @Transform(({ value }) => {
    // Handle comma-separated string from query params
    if (typeof value === 'string') {
      return value.split(',').map((v: string) => v.trim());
    }
    // Handle single value (not array)
    if (value && !Array.isArray(value)) {
      return [value];
    }
    return value;
  })
  sortOrder?: SortOrder[] = [SortOrder.DESC];

  /**
   * Comma-separated list of date|amount|createdAt|updatedAt, paired positionally with sortOrder. Unrecognized values silently fall back to 'date' rather than erroring.
   */
  @IsOptional()
  @IsArray({ message: 'Sort by must be an array' })
  @IsString({ each: true, message: 'Each sort field must be a string' })
  @Transform(({ value }) => {
    // Handle comma-separated string from query params
    if (typeof value === 'string') {
      return value.split(',').map((v: string) => v.trim());
    }
    // Handle single value (not array)
    if (value && !Array.isArray(value)) {
      return [value];
    }
    return value;
  })
  sortBy?: string[] = ['date'];

  /**
   * Filter to a specific year (or the whole year if filterMonth is omitted). Ignored if startDate or endDate is also provided.
   */
  // Additional optional year/month filters (OR-ed with start/end range)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'filterYear must be an integer year' })
  @Min(1900)
  @Max(2100)
  filterYear?: number;

  /**
   * Filter to a specific month (1-12) within filterYear. Ignored if startDate or endDate is also provided, and has no effect unless filterYear is also set.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'filterMonth must be an integer' })
  @Min(1)
  @Max(12)
  filterMonth?: number;

  /**
   * Filter to expenses that have at least one item whose name contains this text (case-insensitive).
   */
  @IsOptional()
  @IsString({ message: 'Item name must be a string' })
  @MaxLength(255, { message: 'Item name cannot exceed 255 characters' })
  itemName?: string;

  /**
   * Filter to expenses tagged with any of these tag UUIDs (comma-separated string or array).
   */
  @IsOptional()
  @IsArray({ message: 'Tag IDs must be an array' })
  @IsUUID('4', { each: true, message: 'Each tag ID must be a valid UUID' })
  @Transform(({ value }) => {
    // Handle comma-separated string from query params
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((id: string) => id.trim())
        .filter(Boolean);
    }
    return value;
  })
  tagIds?: string[];
}
