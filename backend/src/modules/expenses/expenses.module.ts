import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpenseItemsController } from './expense-items.controller';
import { ExpensesService } from './expenses.service';
import { ExpenseItemsService } from './expense-items.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { TaxesModule } from '../taxes/taxes.module';

@Module({
  imports: [PrismaModule, UsersModule, AttachmentsModule, TaxesModule],
  controllers: [ExpensesController, ExpenseItemsController],
  providers: [ExpensesService, ExpenseItemsService],
  exports: [ExpensesService, ExpenseItemsService],
})
export class ExpensesModule {}
