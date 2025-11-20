import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
  console.log('🔗 Connected to test database');
});

afterAll(async () => {
  // Disconnect from test database
  await prisma.$disconnect();
  console.log('🔌 Disconnected from test database');
});

afterEach(async () => {
  // Clean database between tests
  // Delete in order to respect foreign key constraints
  await prisma.$transaction([
    prisma.expense.deleteMany(),
    prisma.importSession.deleteMany(),
    prisma.financialConnection.deleteMany(),
    prisma.category.deleteMany({ where: { userId: { not: null } } }), // Only delete custom categories
    prisma.user.deleteMany(),
  ]);
});

export { prisma };
