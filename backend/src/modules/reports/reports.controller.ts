import { Controller, Get, Query, Request, Param } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { SpendingOverTimeQueryDto } from './dto/spending-over-time.dto';
import { SpendingByCategoryQueryDto } from './dto/spending-by-category.dto';
import { SpendingByCategoryTagsQueryDto } from './dto/spending-by-category-tags.dto';
import { BudgetVsActualQueryDto } from './dto/budget-vs-actual.dto';
import { IncomeVsExpenseQueryDto } from './dto/income-vs-expense.dto';

@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'reports' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('spending-over-time')
  getSpendingOverTime(@Query() query: SpendingOverTimeQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getSpendingOverTime(userId, query);
  }

  @Get('spending-by-category')
  getSpendingByCategory(@Query() query: SpendingByCategoryQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getSpendingByCategory(userId, query);
  }

  @Get('spending-by-category-tags')
  getSpendingByCategoryTags(@Query() query: SpendingByCategoryTagsQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getSpendingByCategoryTags(userId, query);
  }

  @Get('spending-by-subcategory')
  getSpendingBySubcategory(@Query() query: SpendingByCategoryQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getSpendingBySubcategory(userId, query);
  }

  @Get('budget-vs-actual')
  getBudgetVsActual(@Query() query: BudgetVsActualQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getBudgetVsActual(userId, query);
  }

  // New: Budget reports (category & subcategory) backed by DB views
  @Get('budgets/categories')
  getCategoryBudgetReport(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('categoryId') categoryId: string | undefined,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.reportsService.getCategoryBudgetReport(userId, { startDate, endDate, categoryId });
  }

  @Get('budgets/subcategories')
  getSubcategoryBudgetReport(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('categoryId') categoryId: string | undefined,
    @Query('subcategoryId') subcategoryId: string | undefined,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.reportsService.getSubcategoryBudgetReport(userId, {
      startDate,
      endDate,
      categoryId,
      subcategoryId,
    });
  }

  @Get('income-vs-expense')
  getIncomeVsExpense(@Query() query: IncomeVsExpenseQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getIncomeVsExpense(userId, query);
  }

  /**
   * GET /reports/budgets/total
   * Get total budget amount for a date range
   */
  @Get('budgets/total')
  getTotalBudget(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.reportsService.getTotalBudget(userId, { startDate, endDate });
  }

  /**
   * GET /reports/items/top
   * Get top expense items aggregated by name
   */
  @Get('items/top')
  getTopExpenseItems(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('categoryId') categoryId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.reportsService.getTopExpenseItems(userId, {
      startDate,
      endDate,
      categoryId,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  /**
   * GET /reports/subcategory/:id/items
   * Get line items for a specific subcategory within date range
   */
  @Get('subcategory/:id/items')
  getSubcategoryLineItems(
    @Param('id') subcategoryId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.reportsService.getSubcategoryLineItems(userId, {
      subcategoryId,
      startDate,
      endDate,
    });
  }

  /**
   * GET /reports/items/search
   * Search expense items by name
   */
  @Get('items/search')
  searchExpenseItems(
    @Query('q') query: string,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('categoryId') categoryId: string | undefined,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.reportsService.searchExpenseItems(userId, {
      query: query || '',
      startDate,
      endDate,
      categoryId,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }
}
