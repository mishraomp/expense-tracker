import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseItemDto } from './create-expense-item.dto';

/**
 * DTO for updating an expense item.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateExpenseItemDto extends PartialType(CreateExpenseItemDto) {}
