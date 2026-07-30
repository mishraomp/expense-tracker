import { ApiProperty } from '@nestjs/swagger';

export class CategoryBudgetReportRowResponseDto {
  category_id: string;
  category_name: string;

  @ApiProperty({ enum: ['predefined', 'custom'] })
  category_type: 'predefined' | 'custom';

  color_code: string | null;
  icon: string | null;
  user_id: string | null;
  budget_amount: string | null;

  @ApiProperty({ enum: ['monthly', 'annual'], nullable: true })
  budget_period: 'monthly' | 'annual' | null;

  period_start: Date | null;
  period_end: Date | null;
  total_spent: string;
  percent_used: string | null;
  remaining_budget: string | null;
  is_over_budget: boolean;
  over_budget_amount: string | null;
}

export class SubcategoryBudgetReportRowResponseDto {
  subcategory_id: string;
  subcategory_name: string;
  category_id: string;
  category_name: string;

  @ApiProperty({ enum: ['predefined', 'custom'] })
  category_type: 'predefined' | 'custom';

  category_color: string | null;
  category_icon: string | null;
  user_id: string | null;
  budget_amount: string | null;

  @ApiProperty({ enum: ['monthly', 'annual'], nullable: true })
  budget_period: 'monthly' | 'annual' | null;

  period_start: Date | null;
  period_end: Date | null;
  total_spent: string;
  percent_used: string | null;
  remaining_budget: string | null;
  is_over_budget: boolean;
  over_budget_amount: string | null;
}
