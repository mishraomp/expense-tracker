import { PartialType } from '@nestjs/swagger';
import { CreateExpenseDto } from './create-expense.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {
  /**
   * Set to null to remove the subcategory. Do NOT send categoryId: null — category is required and this will cause a server error (categoryId is inherited as optional-but-nullable by PartialType, but the column itself is NOT NULL).
   */
  @IsOptional()
  @IsUUID('4', { message: 'Subcategory must be a valid UUID' })
  subcategoryId?: string;
}
