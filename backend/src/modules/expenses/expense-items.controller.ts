import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { ExpenseItemsService } from './expense-items.service';
import { CreateExpenseItemDto } from './dto/create-expense-item.dto';
import { UpdateExpenseItemDto } from './dto/update-expense-item.dto';

/**
 * Controller for managing expense items (line items within an expense).
 * All routes are nested under /expenses/:expenseId/items.
 */
@ApiTags('Expense Items')
@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'expenses/:expenseId/items' })
export class ExpenseItemsController {
  constructor(private readonly expenseItemsService: ExpenseItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new expense item',
    description:
      "Item amount must not push the sum of the expense's items above the expense total (400 if exceeded). Note: gstApplicable/pstApplicable sent here are currently ignored — tax is not calculated for items added via this endpoint (unlike embedding items inline in POST /expenses, which does compute taxes).",
  })
  @ApiParam({ name: 'expenseId', description: 'Parent expense ID' })
  create(
    @Param('expenseId') expenseId: string,
    @Body() createDto: CreateExpenseItemDto,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.expenseItemsService.create(userId, expenseId, createDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create multiple expense items at once',
    description:
      "The combined amount of the new items must not push the sum of the expense's items above the expense total (400 if exceeded). Note: gstApplicable/pstApplicable sent here are currently ignored — tax is not calculated for items added via this endpoint (unlike embedding items inline in POST /expenses, which does compute taxes).",
  })
  @ApiBody({ type: [CreateExpenseItemDto] })
  @ApiParam({ name: 'expenseId', description: 'Parent expense ID' })
  bulkCreate(
    @Param('expenseId') expenseId: string,
    @Body() items: CreateExpenseItemDto[],
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.expenseItemsService.bulkCreate(userId, expenseId, items);
  }

  @Get()
  @ApiOperation({ summary: 'List all items for an expense' })
  @ApiParam({ name: 'expenseId', description: 'Parent expense ID' })
  findAll(@Param('expenseId') expenseId: string, @Request() req) {
    const userId = req.user.sub;
    return this.expenseItemsService.findAll(userId, expenseId);
  }

  @Get(':itemId')
  @ApiOperation({ summary: 'Get a single expense item' })
  @ApiParam({ name: 'expenseId', description: 'Parent expense ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  findOne(@Param('expenseId') expenseId: string, @Param('itemId') itemId: string, @Request() req) {
    const userId = req.user.sub;
    return this.expenseItemsService.findOne(userId, expenseId, itemId);
  }

  @Put(':itemId')
  @ApiOperation({
    summary: 'Update an expense item',
    description:
      'Amount changes are validated against the parent expense total. Changing gstApplicable/pstApplicable updates the flags only — gstAmount/pstAmount are NOT recalculated by this endpoint.',
  })
  @ApiParam({ name: 'expenseId', description: 'Parent expense ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  update(
    @Param('expenseId') expenseId: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateExpenseItemDto,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.expenseItemsService.update(userId, expenseId, itemId, updateDto);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an expense item',
    description: 'Soft delete — the record is not physically removed.',
  })
  @ApiParam({ name: 'expenseId', description: 'Parent expense ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  remove(@Param('expenseId') expenseId: string, @Param('itemId') itemId: string, @Request() req) {
    const userId = req.user.sub;
    return this.expenseItemsService.remove(userId, expenseId, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete all items for an expense',
    description: 'Soft delete — the record is not physically removed.',
  })
  @ApiParam({ name: 'expenseId', description: 'Parent expense ID' })
  removeAll(@Param('expenseId') expenseId: string, @Request() req) {
    const userId = req.user.sub;
    return this.expenseItemsService.removeAll(userId, expenseId);
  }
}
