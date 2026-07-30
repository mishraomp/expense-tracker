import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SpendingOverTimeQueryDto {
  /**
   * YYYY-MM-DD, inclusive start of the range.
   */
  @IsDateString()
  startDate!: string;

  /**
   * YYYY-MM-DD, inclusive end of the range.
   */
  @IsDateString()
  endDate!: string;

  /**
   * Bucket granularity. One of: 'day' (raw date), 'week'
   * (DATE_TRUNC('week', ...)), 'month' (DATE_TRUNC('month', ...)).
   */
  @ApiProperty({ enum: ['day', 'week', 'month'] })
  @IsEnum({ day: 'day', week: 'week', month: 'month' })
  interval!: 'day' | 'week' | 'month';

  /**
   * Restrict to a single category UUID.
   */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /**
   * Restrict to a single subcategory UUID.
   */
  @IsOptional()
  @IsUUID()
  subcategoryId?: string;
}

/**
 * One bucket's total spending.
 */
export class SpendingOverTimePointDto {
  /**
   * Bucket date, YYYY-MM-DD.
   */
  bucket: string;

  /**
   * Total spending for this bucket, as a decimal string.
   */
  amount: string;
}

/**
 * Metadata returned with the spending-over-time report.
 */
export class SpendingOverTimeMetaDto {
  /**
   * Echoes back the requested bucket granularity.
   */
  @ApiProperty({ enum: ['day', 'week', 'month'] })
  interval: 'day' | 'week' | 'month';
}

/**
 * Response for the spending-over-time report.
 */
export class SpendingOverTimeResponseDto {
  /**
   * Spending points, one per bucket, ordered ascending by bucket.
   */
  data: SpendingOverTimePointDto[];

  /**
   * Echoes back the requested interval.
   */
  @ApiProperty({ type: () => SpendingOverTimeMetaDto })
  meta: SpendingOverTimeMetaDto;
}
