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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.create(userId, createExpenseDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Body() bulkCreateDto: BulkCreateExpenseDto, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.bulkCreate(userId, bulkCreateDto.expenses);
  }

  @Get()
  findAll(@Query() query: ExpenseListQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.findAll(userId, query);
  }

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

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.findOne(userId, id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.update(userId, id, updateExpenseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.expensesService.remove(userId, id);
  }
}
