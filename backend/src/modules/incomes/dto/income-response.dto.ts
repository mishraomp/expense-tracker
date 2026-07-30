import { Income, IncomeSource, IncomeFrequency } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IncomeAttachmentDto {
  /** Attachment ID. */
  id: string;

  /** Original file name. */
  originalFilename: string;

  /** File media type. */
  mimeType: string;

  /** File size in bytes. */
  sizeBytes: number;

  /** Google Drive browser URL, if available. */
  webViewLink: string | null;

  /** Attachment lifecycle state. */
  @ApiProperty({ enum: ['ACTIVE', 'REMOVED'] })
  status: 'ACTIVE' | 'REMOVED';

  /** When the attachment was created. */
  createdAt: Date;
}

export class IncomeResponseDto {
  /**
   * Income row ID.
   */
  id: string;

  /**
   * Owning user's ID.
   */
  userId: string;

  /**
   * Income amount.
   */
  amount: number;

  /**
   * Formatted as YYYY-MM-DD (date-only, no time).
   */
  date: string;

  /**
   * One of: salary, bonus, investment, rental, freelance, gift, other.
   */
  @ApiProperty({ enum: IncomeSource })
  source: IncomeSource;

  /**
   * One of: one_time, weekly, biweekly, monthly, quarterly, annual.
   */
  @ApiProperty({ enum: IncomeFrequency })
  frequency: IncomeFrequency;

  /**
   * Free-text description, if any.
   */
  description: string | null;

  /**
   * Employer name, if any.
   */
  employer: string | null;

  /**
   * Whether this income was created/marked as recurring.
   */
  isRecurring: boolean;

  /**
   * Row creation timestamp.
   */
  createdAt: Date;

  /**
   * Row last-updated timestamp.
   */
  updatedAt: Date;

  /**
   * Number of ACTIVE attachments linked to this income. Only populated on
   * list/get responses — always undefined on create/update responses.
   */
  attachmentCount?: number;

  /**
   * Active attachment metadata. Only populated on the detail response.
   */
  @ApiPropertyOptional({ type: () => [IncomeAttachmentDto] })
  attachments?: IncomeAttachmentDto[];

  static fromPrisma(income: Income, attachmentCount?: number): IncomeResponseDto {
    return {
      id: income.id,
      userId: income.userId,
      amount: income.amount.toNumber(),
      date: income.date.toISOString().split('T')[0],
      source: income.source,
      frequency: income.frequency,
      description: income.description,
      employer: income.employer,
      isRecurring: income.isRecurring,
      createdAt: income.createdAt,
      updatedAt: income.updatedAt,
      attachmentCount,
    };
  }
}
