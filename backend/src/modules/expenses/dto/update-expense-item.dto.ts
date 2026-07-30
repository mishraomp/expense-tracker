import { PartialType } from '@nestjs/swagger';
import { CreateExpenseItemDto } from './create-expense-item.dto';

/**
 * DTO for updating an expense item.
 * All fields are optional - only provided fields will be updated.
 * Updating gstApplicable/pstApplicable here does NOT recalculate gstAmount/pstAmount (unlike PUT /expenses/:id, which does recalculate for the parent expense).
 */
export class UpdateExpenseItemDto extends PartialType(CreateExpenseItemDto) {}
