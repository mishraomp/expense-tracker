import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {
  @IsOptional()
  @IsUUID('4', { message: 'Subcategory must be a valid UUID' })
  subcategoryId?: string;
}
