import { Controller, Get, Query, Request, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
import { SpendingOverTimeResponseDto } from './dto/spending-over-time.dto';
import { CategoryBreakdownItemDto } from './dto/spending-by-category.dto';
import { SpendingByCategoryTagsResponseDto } from './dto/spending-by-category-tags.dto';
import { BudgetVsActualPointDto } from './dto/budget-vs-actual.dto';
import { IncomeVsExpenseResponseDto } from './dto/income-vs-expense.dto';

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
  @ApiOperation({
    summary: 'Get spending grouped over time',
    description:
      'startDate/endDate are inclusive. interval controls bucket granularity: day=raw date, ' +
      "week=DATE_TRUNC('week',...), month=DATE_TRUNC('month',...).",
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'interval', enum: ['day', 'week', 'month'], required: true })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Category UUID filter.' })
  @ApiQuery({ name: 'subcategoryId', required: false, description: 'Subcategory UUID filter.' })
  @ApiOkResponse({ type: SpendingOverTimeResponseDto })
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
  @ApiOperation({
    summary: 'Get spending grouped by category',
    description:
      "Sums by the expense's own category_id only — does NOT account for per-line-item " +
      'category overrides (unlike spending-by-category-tags/items/top/items/search, which do ' +
      'via COALESCE(item.category_id, expense.category_id)).',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Category UUID filter.' })
  @ApiQuery({ name: 'subcategoryId', required: false, description: 'Subcategory UUID filter.' })
  @ApiOkResponse({ type: [CategoryBreakdownItemDto] })
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
  @ApiOperation({
    summary: 'Get expenses matching a category or tags',
    description:
      'Requires at least one of categoryId or tagIds (400 otherwise). When both are given, ' +
      'matching is OR, not AND — an expense matching EITHER the category or the tags is ' +
      'included. Tags match a tag on the expense itself OR on any of its line items; ' +
      "categoryId similarly matches the expense's own category OR a line-item-level category override.",
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Category UUID filter.' })
  @ApiQuery({
    name: 'tagIds',
    required: false,
    isArray: true,
    description: 'Tag UUIDs, as repeated values or a comma-separated list.',
  })
  @ApiOkResponse({ type: SpendingByCategoryTagsResponseDto })
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
  @ApiOperation({
    summary: 'Get spending grouped by subcategory',
    description:
      'Reuses the category query DTO for a subcategory-grouped report. Prefers item-level ' +
      'subcategory assignment; falls back to expense-level assignment only when no item shares ' +
      'that subcategory, to avoid double-counting.',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Category UUID filter.' })
  @ApiQuery({ name: 'subcategoryId', required: false, description: 'Subcategory UUID filter.' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subcategoryId: { type: 'string' },
          subcategoryName: { type: 'string' },
          categoryId: { type: 'string' },
          categoryName: { type: 'string' },
          colorCode: {
            type: 'string',
            nullable: true,
            description: 'Category display color, or null if unset.',
          },
          amount: { type: 'string', description: 'Summed amount, as a decimal string.' },
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Compare monthly budget with actual spending',
    description:
      'Compares monthly actual spending against a monthly-equivalent budget figure (subcategory ' +
      'budgets overlapping the date range take precedence over category budgets, annual budgets ' +
      'normalized to /12) for each month in the range.',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Category UUID filter.' })
  @ApiQuery({ name: 'subcategoryId', required: false, description: 'Subcategory UUID filter.' })
  @ApiOkResponse({ type: [BudgetVsActualPointDto] })
  getBudgetVsActual(@Query() query: BudgetVsActualQueryDto, @Request() req) {
    const userId = req.user.sub;
    return this.reportsService.getBudgetVsActual(userId, query);
  }

  // New: Budget reports (category & subcategory) backed by DB views
  /**
   * Budget report backed by the vw_category_budget_report DB view.
   */
  @Get('budgets/categories')
  @ApiOperation({
    summary: 'Get the category budget report',
    description: 'Budget report backed by the vw_category_budget_report DB view.',
  })
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
  @ApiOperation({
    summary: 'Get the subcategory budget report',
    description: 'Budget report backed by the vw_subcategory_budget_report DB view.',
  })
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
  @ApiOperation({
    summary: 'Compare income and expenses',
    description:
      'Omitting both startDate and endDate sums ALL-TIME income/expenses — there is no default date range.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD, inclusive.' })
  @ApiOkResponse({ type: IncomeVsExpenseResponseDto })
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
  @ApiOperation({
    summary: 'Get total overlapping budget amount',
    description:
      'Sums ALL category-level AND subcategory-level budgets overlapping the range with no ' +
      'precedence/dedup — if a category and one of its subcategories both have overlapping ' +
      'budgets, BOTH amounts are added (unlike budget-vs-actual, which applies ' +
      'subcategory-overrides-category precedence).',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        totalBudget: {
          type: 'number',
          description: 'Sum of all overlapping category and subcategory budgets.',
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get total expenses covered by a budget',
    description:
      "An expense counts as 'budgeted' if its category OR its subcategory has an overlapping budget for the range.",
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        budgetedExpenses: {
          type: 'number',
          description: 'Sum of expense amounts covered by an overlapping budget.',
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get the highest-spending expense items',
    description:
      'Groups items by LOWER(TRIM(name)) across categories and dates. Default limit=10. The ' +
      'categoryName/categoryId shown per group is the statistically most-frequent category ' +
      'among the grouped items, not a guaranteed single true category.',
  })
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
  @ApiOperation({
    summary: 'List line items for a subcategory',
    description:
      'Returns ONLY expense_items (line items) assigned to this subcategory — explicitly ' +
      'EXCLUDES expenses directly assigned to the subcategory without line items (unlike ' +
      'spending-by-subcategory, which includes both).',
  })
  @ApiParam({ name: 'id', description: 'Subcategory UUID.' })
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD, inclusive.' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Expense item UUID.' },
              name: { type: 'string' },
              amount: { type: 'string', description: 'Item amount, as a decimal string.' },
              expenseId: { type: 'string', description: 'Parent expense UUID.' },
              expenseDate: { type: 'string', format: 'date' },
              expenseDescription: { type: 'string', nullable: true },
              source: {
                type: 'string',
                enum: ['item'],
                description: 'Always "item" — every row here is a line item.',
              },
            },
          },
        },
        total: { type: 'string', description: 'Sum of amount across items, as a decimal string.' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Search expense items',
    description:
      'q is a case-insensitive substring match against item name; an empty q matches ' +
      'everything. Pagination: default page=1, default pageSize=20, no upper bound enforced on pageSize.',
  })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Expense item UUID.' },
              name: { type: 'string' },
              amount: { type: 'string', description: 'Item amount, as a decimal string.' },
              expenseId: { type: 'string', description: 'Parent expense UUID.' },
              expenseDate: { type: 'string', format: 'date' },
              expenseDescription: { type: 'string', nullable: true },
              categoryId: {
                type: 'string',
                nullable: true,
                description: 'Effective category (item override, else expense category).',
              },
              categoryName: { type: 'string', nullable: true },
              subcategoryId: { type: 'string', nullable: true },
              subcategoryName: { type: 'string', nullable: true },
              notes: { type: 'string', nullable: true },
            },
          },
        },
        total: { type: 'integer', description: 'Total matching rows across all pages.' },
      },
    },
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
