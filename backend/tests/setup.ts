import { beforeAll, afterAll, afterEach } from 'vitest';

let prisma: any;

// Use in-memory mock Prisma for all Vitest tests
// Contract tests should use NestJS Test module which handles Prisma properly
const users: any[] = [];
const categories: any[] = [];
const expenses: any[] = [];
const incomes: any[] = [];
const attachments: any[] = [];
let idCounter = 1;
const genId = () => `mock-${idCounter++}`;

prisma = {
  $connect: async () => {},
  $disconnect: async () => {},
  $transaction: async (ops: any[]) => {
    const results = [];
    for (const op of ops) {
      if (typeof op === 'function') {
        results.push(await op(prisma));
      } else {
        results.push(await op);
      }
    }
    return results;
  },
  user: {
    create: async ({ data }: any) => {
      const row = { id: genId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      users.push(row);
      return row;
    },
    deleteMany: async () => {
      users.length = 0;
    },
    findMany: async () => users,
  },
  category: {
    create: async ({ data }: any) => {
      const row = { id: genId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      categories.push(row);
      return row;
    },
    deleteMany: async () => {
      categories.length = 0;
    },
    findMany: async () => categories,
  },
  expense: {
    create: async ({ data }: any) => {
      const row = { id: genId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      expenses.push(row);
      return row;
    },
    findUnique: async ({ where }: any) => expenses.find((e) => e.id === where.id) || null,
    deleteMany: async () => {
      expenses.length = 0;
    },
    findMany: async () => expenses,
  },
  income: {
    create: async ({ data }: any) => {
      const row = { id: genId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      incomes.push(row);
      return row;
    },
    findUnique: async ({ where }: any) => incomes.find((i) => i.id === where.id) || null,
    deleteMany: async () => {
      incomes.length = 0;
    },
    findMany: async () => incomes,
  },
  attachment: {
    count: async ({ where }: any) => {
      return attachments.filter((a) => {
        if (where.linkedExpenseId)
          return a.linkedExpenseId === where.linkedExpenseId && a.status === where.status;
        if (where.linkedIncomeId)
          return a.linkedIncomeId === where.linkedIncomeId && a.status === where.status;
        return false;
      }).length;
    },
    create: async ({ data }: any) => {
      const row = { id: genId(), createdAt: new Date(), ...data };
      attachments.push(row);
      return row;
    },
    findMany: async ({ where, orderBy }: any) => {
      let filtered = attachments.filter((a) => {
        if (where.linkedExpenseId) return a.linkedExpenseId === where.linkedExpenseId;
        if (where.linkedIncomeId) return a.linkedIncomeId === where.linkedIncomeId;
        return true;
      });
      if (orderBy && orderBy.createdAt) {
        filtered = filtered.sort((a, b) => {
          return orderBy.createdAt === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime();
        });
      }
      return filtered;
    },
  },
  importSession: { deleteMany: async () => {} },
  financialConnection: { deleteMany: async () => {} },
};

import { driveProviderMock } from './setup-drive-mocks';

beforeAll(async () => {
  await prisma.$connect();
  (global as any).driveProvider = driveProviderMock;
  console.log('🧪 Using in-memory mock Prisma (contract tests via NestJS Test module use real DB)');
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log('🧪 In-memory mock teardown complete');
});

afterEach(async () => {
  users.length = 0;
  categories.length = 0;
  expenses.length = 0;
  incomes.length = 0;
  attachments.length = 0;
});

export { prisma };
