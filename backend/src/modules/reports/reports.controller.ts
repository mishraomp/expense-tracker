import { Controller, Get, Query, Request, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { SpendingOverTimeQueryDto } from './dto/spending-over-time.dto';
import { SpendingByCategoryQueryDto } from './dto/spending-by-category.dto';
import { SpendingByCategoryTagsQueryDto } from './dto/spending-by-category-tags.dto';
import { BudgetVsActualQueryDto } from './dto/budget-vs-actual.dto';
import { IncomeVsExpenseQueryDto } from './dto/income-vs-expense.dto';
import {
  CategoryBudgetReportRowResponseDto,
  SubcategoryBudgetReportRowResponseDto,
} from './dto/budget-report-response.dto';
import { TopExpenseItemResponseDto } from './dto/top-expense-item-response.dto';

@ApiTags('Reports')
@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'reports' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * startDate/endDate are inclusive. interval controls bucket granularity:
   * day=raw date, week=DATE_TRUNC('week',...), month=DATE_TRUNC('month',...).
   */
  @Get('spending-over-time')
  getSpendingOverTime(@Query() query: SpendingOverTimeQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getSpendingOverTime(userId, query);
  }

  /**
   * Sums by the expense's own category_id only — does NOT account for
   * per-line-item category overrides (unlike
   * getSpendingByCategoryTags/getTopExpenseItems/searchExpenseItems, which
   * do via COALESCE(item.category_id, expense.category_id)).
   */
  @Get('spending-by-category')
  getSpendingByCategory(@Query() query: SpendingByCategoryQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getSpendingByCategory(userId, query);
  }

  /**
   * Requires at least one of categoryId or tagIds (400 otherwise). When both
   * are given, matching is OR, not AND — an expense matching EITHER the
   * category or the tags is included. Tags match a tag on the expense itself
   * OR on any of its line items; categoryId similarly matches the expense's
   * own category OR a line-item-level category override.
   */
  @Get('spending-by-category-tags')
  getSpendingByCategoryTags(@Query() query: SpendingByCategoryTagsQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getSpendingByCategoryTags(userId, query);
  }

  /**
   * Reuses the category query DTO for a subcategory-grouped report. Prefers
   * item-level subcategory assignment; falls back to expense-level
   * assignment only when no item shares that subcategory, to avoid
   * double-counting.
   */
  @Get('spending-by-subcategory')
  getSpendingBySubcategory(@Query() query: SpendingByCategoryQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getSpendingBySubcategory(userId, query);
  }

  /**
   * Compares monthly actual spending against a monthly-equivalent budget
   * figure (subcategory budgets overlapping the date range take precedence
   * over category budgets, annual budgets normalized to /12) for each month
   * in the range.
   */
  @Get('budget-vs-actual')
  getBudgetVsActual(@Query() query: BudgetVsActualQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getBudgetVsActual(userId, query);
  }

  // New: Budget reports (category & subcategory) backed by DB views
  /**
   * Budget report backed by the vw_category_budget_report DB view.
   */
  @Get('budgets/categories')
  @ApiOkResponse({ type: [CategoryBudgetReportRowResponseDto] })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'YYYY-MM-DD. Only budget periods overlapping this range are included.',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'YYYY-MM-DD. Only budget periods overlapping this range are included.',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Restrict the report to a single category UUID.',
  })
  getCategoryBudgetReport(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('categoryId') categoryId: string | undefined,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.reportsService.getCategoryBudgetReport(userId, { startDate, endDate, categoryId });
  }

  /**
   * Budget report backed by the vw_subcategory_budget_report DB view.
   */
  @Get('budgets/subcategories')
  @ApiOkResponse({ type: [SubcategoryBudgetReportRowResponseDto] })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'YYYY-MM-DD. Only budget periods overlapping this range are included.',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'YYYY-MM-DD. Only budget periods overlapping this range are included.',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Restrict the report to subcategories of this category UUID.',
  })
  @ApiQuery({
    name: 'subcategoryId',
    required: false,
    description: 'Restrict the report to a single subcategory UUID.',
  })
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

  /**
   * Omitting both startDate and endDate sums ALL-TIME income/expenses —
   * there is no default date range.
   */
  @Get('income-vs-expense')
  getIncomeVsExpense(@Query() query: IncomeVsExpenseQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getIncomeVsExpense(userId, query);
  }

  /**
   * GET /reports/budgets/total
   *
   * Sums ALL category-level AND subcategory-level budgets overlapping the
   * range with no precedence/dedup — if a category and one of its
   * subcategories both have overlapping budgets, BOTH amounts are added
   * (unlike getBudgetVsActual, which applies subcategory-overrides-category
   * precedence).
   */
  @Get('budgets/total')
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  getTotalBudget(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.reportsService.getTotalBudget(userId, { startDate, endDate });
  }

  /**
   * GET /reports/budgets/expenses
   *
   * An expense counts as 'budgeted' if its category OR its subcategory has
   * an overlapping budget for the range.
   */
  @Get('budgets/expenses')
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  getBudgetedExpenses(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.reportsService.getBudgetedExpenses(userId, { startDate, endDate });
  }

  /**
   * GET /reports/items/top
   *
   * Groups items by LOWER(TRIM(name)) across categories and dates. Default
   * limit=10. The categoryName/categoryId shown per group is the
   * statistically most-frequent category among the grouped items, not a
   * guaranteed single true category.
   */
  @Get('items/top')
  @ApiOkResponse({ type: [TopExpenseItemResponseDto] })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description:
      'Restrict to items whose effective category (line-item override, else expense category) matches this UUID.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max number of grouped items to return. Defaults to 10.',
  })
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
   *
   * Returns ONLY expense_items (line items) assigned to this subcategory —
   * explicitly EXCLUDES expenses directly assigned to the subcategory
   * without line items (unlike getSpendingBySubcategory, which includes
   * both).
   */
  @Get('subcategory/:id/items')
  @ApiParam({ name: 'id', description: 'Subcategory UUID.' })
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
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
   *
   * q is a case-insensitive substring match; an empty q matches everything.
   * Pagination: default page=1, default pageSize=20, no upper bound enforced
   * on pageSize.
   */
  @Get('items/search')
  @ApiQuery({
    name: 'q',
    required: false,
    description:
      'Case-insensitive substring match against item name. Empty/omitted matches everything.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description:
      'Restrict to items whose effective category (line-item override, else expense category) matches this UUID.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number, 1-based. Defaults to 1.',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Results per page. Defaults to 20. No upper bound enforced.',
  })
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
