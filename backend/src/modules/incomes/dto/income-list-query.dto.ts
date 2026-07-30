import { Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IncomeSource, IncomeFrequency } from '@prisma/client';

export class IncomeListQueryDto {
  /**
   * 1900-3000. If month is set, year is required (400 otherwise).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(3000)
  year?: number;

  /**
   * 1-12. Requires year to also be set.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  /**
   * YYYY-MM-DD. Combines additively with year/month filters rather than
   * overriding them.
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * YYYY-MM-DD. Combines additively with year/month filters rather than
   * overriding them.
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /**
   * One of: salary, bonus, investment, rental, freelance, gift, other.
   */
  @ApiPropertyOptional({ enum: IncomeSource })
  @IsOptional()
  @IsEnum(IncomeSource)
  source?: IncomeSource;

  /**
   * One of: one_time, weekly, biweekly, monthly, quarterly, annual.
   */
  @ApiPropertyOptional({ enum: IncomeFrequency })
  @IsOptional()
  @IsEnum(IncomeFrequency)
  frequency?: IncomeFrequency;

  /**
   * Case-insensitive SUBSTRING match, not exact.
   */
  @IsOptional()
  @IsString()
  employer?: string;
}
