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
  const user = await prisma.user.create({ data: { email: 'u2@example.com' } });
  const category = await prisma.category.create({ data: { name: 'General', type: 'predefined' } });
  return prisma.expense.create({
    data: {
      userId: user.id,
      categoryId: category.id,
      amount: 50.0,
      date: new Date('2025-02-10'),
      source: 'manual',
      status: 'confirmed',
    },
  });
}

describe.skip('Attachments invalid cases (E2E with Playwright)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockPrisma = prisma as PrismaService; // use global mock/in-memory prisma
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

  it('rejects unsupported mime type (expected 400)', async () => {
    const expense = await seedExpense();
    const res = await request(app.getHttpServer())
      .post('/api/attachments')
      .set('Authorization', 'Bearer test')
      .field('recordType', 'expense')
      .field('recordId', expense.id)
      .attach('file', Buffer.from('MZ\x00'), 'malware.exe');
    expect(res.status).toBe(400);
  });

  it('rejects file exceeding 5MB (expected 400)', async () => {
    const expense = await seedExpense();
    const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 0); // >5MB
    const res = await request(app.getHttpServer())
      .post('/api/attachments')
      .set('Authorization', 'Bearer test')
      .field('recordType', 'expense')
      .field('recordId', expense.id)
      .attach('file', bigBuffer, 'large.pdf');
    expect(res.status).toBe(400);
  });
});
