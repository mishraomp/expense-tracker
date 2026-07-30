import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseListQueryDto } from './dto/expense-list-query.dto';
import { BulkCreateExpenseDto } from './dto/bulk-create-expense.dto';

@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'expenses' })
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * Creates a single expense. If recurring=true with recurrenceFrequency+numberOfRecurrences set, generates up to 365 recurring expenses and returns only the first one — any items array is ignored entirely when recurring is set. GST/PST amounts are auto-calculated server-side from gstApplicable/pstApplicable and the caller's tax rate; they are not accepted as input.
   * Quirk: the recurring path does not calculate taxes at all — gstAmount/pstAmount are left at their database defaults for every expense in the generated series.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.create(userId, createExpenseDto);
  }

  /**
   * Bulk-creates expenses using category/subcategory NAMES (not UUIDs) — a different contract from POST /expenses. Detects and skips exact amount+date+description duplicates (reported, not an error). GST/PST are never calculated for bulk-created expenses. source is always stored as 'manual' regardless of what's sent. Returns {created, duplicates, failed, summary}, not a plain expense object.
   */
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Body() bulkCreateDto: BulkCreateExpenseDto, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.bulkCreate(userId, bulkCreateDto.expenses);
  }

  /**
   * Lists expenses with filtering, sorting, and pagination — see ExpenseListQueryDto for query parameters.
   */
  @Get()
  findAll(@Query() query: ExpenseListQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.findAll(userId, query);
  }

  /**
   * Sums expenses matching the filters. If categoryId is provided, also returns the effective budget (subcategory budget takes precedence over category budget) for the period — skipped if only subcategoryId is given without categoryId. Unlike GET /expenses, these query params are NOT validated — malformed dates/UUIDs silently yield empty or incorrect results instead of a 400.
   */
  @Get('totals')
  async getTotals(
    @Request() req,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('filterYear') filterYear?: string,
    @Query('filterMonth') filterMonth?: string,
  ) {
    const userId = req.user.sub;
    const result = await this.expensesService.calculateTotals(
      userId,
      categoryId,
      subcategoryId,
      startDate,
      endDate,
      filterYear ? parseInt(filterYear, 10) : undefined,
      filterMonth ? parseInt(filterMonth, 10) : undefined,
    );

    return {
      total: result.total.toNumber(),
      count: result.count,
      budgetAmount: result.budgetAmount?.toNumber(),
      budgetPeriod: result.budgetPeriod,
      budgetSource: result.budgetSource,
    };
  }

  /**
   * Gets a single expense by ID.
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.findOne(userId, id);
  }

  /**
   * Partial update. Providing amount/gstApplicable/pstApplicable triggers server-side tax recalculation; if the expense has items, updated gst/pstApplicable cascade to override every item's tax flag. subcategoryId:null clears the subcategory (valid). categoryId:null is invalid — category is required and will cause a server error. Sending tagIds (even []) fully replaces the existing tag set.
   */
  @Put(':id')
  update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.update(userId, id, updateExpenseDto);
  }

  /**
   * Soft-deletes the expense (sets deletedAt) — the record is not physically removed.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.remove(userId, id);
  }
}
