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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a new expense item' })
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
  @ApiOperation({ summary: 'Create multiple expense items at once' })
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
  findOne(
    @Param('expenseId') expenseId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.expenseItemsService.findOne(userId, expenseId, itemId);
  }

  @Put(':itemId')
  @ApiOperation({ summary: 'Update an expense item' })
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
  @ApiOperation({ summary: 'Delete an expense item' })
  @ApiParam({ name: 'expenseId', description: 'Parent expense ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  remove(
    @Param('expenseId') expenseId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.expenseItemsService.remove(userId, expenseId, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all items for an expense' })
  @ApiParam({ name: 'expenseId', description: 'Parent expense ID' })
  removeAll(@Param('expenseId') expenseId: string, @Request() req) {
    const userId = req.user.sub;
    return this.expenseItemsService.removeAll(userId, expenseId);
  }
}
