import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AttachmentsController } from '../../src/modules/attachments/attachments.controller';
import { AttachmentsService } from '../../src/modules/attachments/attachments.service';
import { LimitCheckService } from '../../src/modules/attachments/services/limit-check.service';
import { GoogleDriveProvider } from '../../src/modules/attachments/providers/google-drive.provider';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestPrismaService } from '../test-prisma.service';

let testPrisma: TestPrismaService;

async function seedExpense() {
  const user = await testPrisma.user.create({ data: { email: 'u1@example.com' } });
  const category = await testPrisma.category.create({
    data: { name: 'General', type: 'predefined' },
  });
  return testPrisma.expense.create({
    data: {
      userId: user.id,
      categoryId: category.id,
      amount: 123.45,
      date: new Date('2025-01-15'),
      source: 'manual',
      status: 'confirmed',
    },
  });
}

describe.skip('Attachments upload success (E2E with Playwright)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    testPrisma = new TestPrismaService();
    await testPrisma.onModuleInit();

    const moduleRef = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [
        AttachmentsService,
        LimitCheckService,
        GoogleDriveProvider,
        { provide: PrismaService, useValue: testPrisma },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await testPrisma.cleanDatabase();
  });

  afterAll(async () => {
    await app.close();
    await testPrisma.onModuleDestroy();
  });

  it('POST /api/attachments returns 201', async () => {
    const expense = await seedExpense();
    const res = await request(app.getHttpServer())
      .post('/api/attachments')
      .field('recordType', 'expense')
      .field('recordId', expense.id)
      .attach('file', Buffer.from('%PDF-1.4 placeholder'), 'receipt.pdf');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      filename: expect.any(String),
      webViewLink: expect.any(String),
    });
  });
});
