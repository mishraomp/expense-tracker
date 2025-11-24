import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AttachmentsController } from '../../src/modules/attachments/attachments.controller';
import { AttachmentsService } from '../../src/modules/attachments/attachments.service';
import { LimitCheckService } from '../../src/modules/attachments/services/limit-check.service';
import { GoogleDriveProvider } from '../../src/modules/attachments/providers/google-drive.provider';
import { prisma } from '../setup';
import { PrismaService } from '../../src/prisma/prisma.service';

async function seedExpense() {
  const user = await prisma.user.create({ data: { email: 'u3@example.com' } });
  const category = await prisma.category.create({ data: { name: 'General', type: 'predefined' } });
  return prisma.expense.create({
    data: {
      userId: user.id,
      categoryId: category.id,
      amount: 77.77,
      date: new Date('2025-03-05'),
      source: 'manual',
      status: 'confirmed',
    },
  });
}

describe.skip('Attachments limit enforcement (E2E with Playwright)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockPrisma = prisma as PrismaService;
    const moduleRef = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [
        AttachmentsService,
        LimitCheckService,
        GoogleDriveProvider,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects 6th attachment (expected 400)', async () => {
    const expense = await seedExpense();
    // Upload 5 files first (will fail until implemented but sets expectation)
    for (let i = 1; i <= 5; i++) {
      await request(app.getHttpServer())
        .post('/api/attachments')
        .set('Authorization', 'Bearer test')
        .field('recordType', 'expense')
        .field('recordId', expense.id)
        .attach('file', Buffer.from('%PDF-1.4 placeholder ' + i), `r${i}.pdf`);
    }
    const res = await request(app.getHttpServer())
      .post('/api/attachments')
      .set('Authorization', 'Bearer test')
      .field('recordType', 'expense')
      .field('recordId', expense.id)
      .attach('file', Buffer.from('%PDF-1.4 placeholder 6'), 'r6.pdf');
    expect(res.status).toBe(400);
  });
});
