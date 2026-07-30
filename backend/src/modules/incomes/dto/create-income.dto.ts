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
import { ApiProperty } from '@nestjs/swagger';
import { IncomeSource, IncomeFrequency } from '@prisma/client';

export class CreateIncomeDto {
  /**
   * Minimum 0.01.
   */
  @IsNumber()
  @Min(0.01)
  amount: number;

  /**
   * ISO date, YYYY-MM-DD.
   */
  @IsDateString()
  @IsNotEmpty()
  date: string;

  /**
   * One of: salary, bonus, investment, rental, freelance, gift, other.
   */
  @ApiProperty({ enum: IncomeSource })
  @IsEnum(IncomeSource)
  @IsNotEmpty()
  source: IncomeSource;

  /**
   * One of: one_time, weekly, biweekly, monthly, quarterly, annual. Drives
   * auto-recurrence generation on create (see controller notes).
   */
  @ApiProperty({ enum: IncomeFrequency })
  @IsEnum(IncomeFrequency)
  @IsNotEmpty()
  frequency: IncomeFrequency;

  /**
   * Free-text description of this income.
   */
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Employer name associated with this income.
   */
  @IsString()
  @IsOptional()
  employer?: string;

  /**
   * Triggers bulk-generation of future income rows on CREATE only (see POST
   * /incomes notes) — has no effect on UPDATE.
   */
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  /**
   * Number of additional future occurrences to pre-create when
   * isRecurring=true on CREATE. If omitted, rolls forward by frequency for
   * ~1 year instead. Only consulted on CREATE, not UPDATE.
   */
  @IsNumber()
  @IsOptional()
  @Min(1)
  numberOfRecurrences?: number;
}
