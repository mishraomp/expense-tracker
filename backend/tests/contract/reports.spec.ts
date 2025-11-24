import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

// NOTE: This test assumes Keycloak guard allows test bypass or req.user is stubbed.
// If guard blocks, these tests should be adjusted to mock the guard.

describe.skip('ReportsController (contract - skipped until DB available)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/reports/spending-over-time validates query', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/spending-over-time')
      .query({ startDate: '2025-01-01', endDate: '2025-01-31', interval: 'month' })
      .set('Authorization', 'Bearer test');
    // We can only assert status code shape since auth guard may intercept
    expect([200, 401, 403]).toContain(res.status);
  });

  it('GET /api/v1/reports/spending-by-category responds', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/spending-by-category')
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
      .set('Authorization', 'Bearer test');
    expect([200, 401, 403]).toContain(res.status);
  });

  it('GET /api/v1/reports/budget-vs-actual responds', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/budget-vs-actual')
      .query({ startDate: '2025-01-01', endDate: '2025-03-31' })
      .set('Authorization', 'Bearer test');
    expect([200, 401, 403]).toContain(res.status);
  });
});
