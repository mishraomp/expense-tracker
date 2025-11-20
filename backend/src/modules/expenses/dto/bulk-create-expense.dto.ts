import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { CreateExpenseWithNamesDto } from './bulk-create-expense-with-names.dto';

export class BulkCreateExpenseDto {
  @IsArray({ message: 'Expenses must be an array' })
  @ArrayMinSize(1, { message: 'At least one expense is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseWithNamesDto)
  expenses: CreateExpenseWithNamesDto[];
}
