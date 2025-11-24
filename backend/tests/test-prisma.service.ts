import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TestPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // DATABASE_URL environment variable is automatically used by Prisma
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    // Clean in correct order respecting foreign keys
    await this.$transaction([
      this.attachment.deleteMany(),
      this.expense.deleteMany(),
      this.income.deleteMany(),
      this.importSession.deleteMany(),
      this.financialConnection.deleteMany(),
      this.category.deleteMany({ where: { userId: { not: null } } }),
      this.user.deleteMany(),
    ]);
  }
}
