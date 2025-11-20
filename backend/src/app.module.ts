import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ImportModule } from './modules/import/import.module';
import { SubcategoriesModule } from './modules/subcategories/subcategories.module';
import { ReportsModule } from './modules/reports/reports.module';
import { IncomesModule } from './modules/incomes/incomes.module';
import { KeycloakAuthGuard } from './common/guards/keycloak-auth.guard';
import { ExportModule } from './modules/export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    ExpensesModule,
    CategoriesModule,
    ImportModule,
    SubcategoriesModule,
    ReportsModule,
    IncomesModule,
    ExportModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: KeycloakAuthGuard,
    },
  ],
})
export class AppModule {}
