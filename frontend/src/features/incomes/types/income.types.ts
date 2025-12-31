export type IncomeSource =
  | 'salary'
  | 'bonus'
  | 'investment'
  | 'rental'
  | 'freelance'
  | 'gift'
  | 'other';
export type IncomeFrequency =
  | 'one_time'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'annual';

export interface Income {
  id: string;
  userId: string;
  amount: number;
  date: string;
  source: IncomeSource;
  frequency: IncomeFrequency;
  description: string | null;
  employer: string | null;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeRequest {
  amount: number;
  date: string;
  source: IncomeSource;
  frequency: IncomeFrequency;
  description?: string;
  employer?: string;
  isRecurring?: boolean;
  numberOfRecurrences?: number;
}

export interface UpdateIncomeRequest {
  amount?: number;
  date?: string;
  source?: IncomeSource;
  frequency?: IncomeFrequency;
  description?: string;
  employer?: string;
  isRecurring?: boolean;
}

export interface IncomeListQuery {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
  source?: IncomeSource;
  frequency?: IncomeFrequency;
  employer?: string;
}
