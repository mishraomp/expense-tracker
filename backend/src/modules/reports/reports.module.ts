import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { SpendingReportsService } from './spending-reports.service';
import { BudgetReportsService } from './budget-reports.service';
import { IncomeReportsService } from './income-reports.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [SpendingReportsService, BudgetReportsService, IncomeReportsService],
})
export class ReportsModule {}
