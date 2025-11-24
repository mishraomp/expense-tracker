import { Income, IncomeSource, IncomeFrequency } from '@prisma/client';

export class IncomeResponseDto {
  id: string;
  userId: string;
  amount: number;
  date: string;
  source: IncomeSource;
  frequency: IncomeFrequency;
  description: string | null;
  employer: string | null;
  isRecurring: boolean;
  createdAt: Date;
  updatedAt: Date;
  attachmentCount?: number; // number of ACTIVE attachments linked to this income

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
