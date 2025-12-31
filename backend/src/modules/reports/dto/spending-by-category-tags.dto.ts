import { Transform } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class SpendingByCategoryTagsQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

export interface SpendingByCategoryTagsExpenseTagDto {
  id: string;
  name: string;
  colorCode: string | null;
}

export interface SpendingByCategoryTagsExpenseDto {
  id: string;
  userId: string;
  categoryId: string;
  subcategoryId: string | null;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string | null;
  source: string;
  status: string;
  merchantName: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    name: string;
    type: string;
    colorCode: string | null;
    icon: string | null;
  };
  subcategory?: { id: string; name: string };
  tags?: SpendingByCategoryTagsExpenseTagDto[];
}

export interface SpendingByCategoryTagsResponseDto {
  data: SpendingByCategoryTagsExpenseDto[];
  summary: {
    totalAmount: number;
    count: number;
  };
}
