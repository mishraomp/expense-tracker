import { beforeAll, afterAll, afterEach } from 'vitest';

let prisma: any;

// Use in-memory mock Prisma for all Vitest tests
// Contract tests should use NestJS Test module which handles Prisma properly
const users: any[] = [];
const categories: any[] = [];
const subcategories: any[] = [];
const expenses: any[] = [];
const incomes: any[] = [];
const attachments: any[] = [];
const budgets: any[] = [];
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
    findUnique: async ({ where }: any) => categories.find((c) => c.id === where.id) || null,
    findFirst: async ({ where }: any) => {
      return (
        categories.find((c) => {
          if (where.id) return c.id === where.id;
          if (where.name) return c.name === where.name;
          return false;
        }) || null
      );
    },
    update: async ({ where, data }: any) => {
      const cat = categories.find((c) => c.id === where.id);
      if (cat) Object.assign(cat, data, { updatedAt: new Date() });
      return cat;
    },
  },
  subcategory: {
    create: async ({ data }: any) => {
      const row = { id: genId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      subcategories.push(row);
      return row;
    },
    deleteMany: async () => {
      subcategories.length = 0;
    },
    findMany: async ({ where }: any) => {
      if (where?.categoryId) {
        return subcategories.filter((s) => s.categoryId === where.categoryId);
      }
      return subcategories;
    },
    findUnique: async ({ where, include }: any) => {
      const sub = subcategories.find((s) => s.id === where.id) || null;
      if (sub && include?.category) {
        const cat = categories.find((c) => c.id === sub.categoryId);
        return { ...sub, category: cat };
      }
      return sub;
    },
    update: async ({ where, data }: any) => {
      const sub = subcategories.find((s) => s.id === where.id);
      if (sub) Object.assign(sub, data, { updatedAt: new Date() });
      return sub;
    },
    delete: async ({ where }: any) => {
      const idx = subcategories.findIndex((s) => s.id === where.id);
      if (idx >= 0) subcategories.splice(idx, 1);
      return {};
    },
  },
  budget: {
    create: async ({ data }: any) => {
      const row = { id: genId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      budgets.push(row);
      return row;
    },
    deleteMany: async ({ where }: any) => {
      const toRemove = budgets.filter((b) => {
        if (where.categoryId) return b.categoryId === where.categoryId;
        if (where.subcategoryId) return b.subcategoryId === where.subcategoryId;
        return false;
      });
      for (const b of toRemove) {
        const idx = budgets.indexOf(b);
        if (idx >= 0) budgets.splice(idx, 1);
      }
      return { count: toRemove.length };
    },
    findMany: async ({ where }: any) => {
      return budgets.filter((b) => {
        if (where?.categoryId) return b.categoryId === where.categoryId;
        if (where?.subcategoryId) return b.subcategoryId === where.subcategoryId;
        return true;
      });
    },
    findFirst: async ({ where, orderBy }: any) => {
      let filtered = budgets.filter((b) => {
        if (where?.categoryId && b.categoryId !== where.categoryId) return false;
        if (where?.subcategoryId && b.subcategoryId !== where.subcategoryId) return false;
        if (where?.startDate?.lte) {
          const targetDate = where.startDate.lte;
          if (b.startDate > targetDate) return false;
        }
        if (where?.endDate?.gte) {
          const targetDate = where.endDate.gte;
          if (b.endDate < targetDate) return false;
        }
        return true;
      });
      // Sort by updatedAt desc (first match wins)
      filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return filtered[0] || null;
    },
    update: async ({ where, data }: any) => {
      const budget = budgets.find((b) => b.id === where.id);
      if (budget) Object.assign(budget, data, { updatedAt: new Date() });
      return budget;
    },
  },
  expense: {
    create: async ({ data }: any) => {
      const row = { id: genId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      expenses.push(row);
      return row;
    },
    count: async ({ where }: any) => {
      if (where?.subcategoryId) {
        return expenses.filter((e) => e.subcategoryId === where.subcategoryId).length;
      }
      return expenses.length;
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
  subcategories.length = 0;
  expenses.length = 0;
  incomes.length = 0;
  attachments.length = 0;
  budgets.length = 0;
});

export { prisma };
