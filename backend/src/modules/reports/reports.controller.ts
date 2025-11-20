import { Controller, Get, Query, Request } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { SpendingOverTimeQueryDto } from './dto/spending-over-time.dto';
import { SpendingByCategoryQueryDto } from './dto/spending-by-category.dto';
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
}
