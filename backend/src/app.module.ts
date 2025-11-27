import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { TagsModule } from './modules/tags/tags.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Serve frontend static files in production mode
    ...(process.env.NODE_ENV === 'production'
      ? [
          ServeStaticModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => [
              {
                rootPath: configService.get<string>(
                  'FRONTEND_PATH',
                  join(__dirname, '..', 'public'),
                ),
                exclude: ['/api/*', '/health', '/docs/*'],
                serveStaticOptions: {
                  index: ['index.html'],
                  fallthrough: true,
                },
              },
            ],
          }),
        ]
      : []),
    PrismaModule,
    UsersModule,
    ExpensesModule,
    CategoriesModule,
    ImportModule,
    SubcategoriesModule,
    ReportsModule,
    IncomesModule,
    ExportModule,
    AttachmentsModule,
    TagsModule,
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
