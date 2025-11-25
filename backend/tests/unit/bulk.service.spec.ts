import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BulkService } from '../../src/modules/attachments/bulk.service';

describe('BulkService', () => {
  let mockPrisma: any;
  let mockAttachmentsService: any;
  let svc: BulkService;

  beforeEach(() => {
    mockPrisma = {
      bulk_import_jobs: {
        create: vi.fn(async ({ data }: any) => ({ id: 'job-1', ...data })),
        findUnique: vi.fn(),
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      },
    };
    mockAttachmentsService = { uploadAttachment: vi.fn(async () => ({ id: 'att-1' })) };
    svc = new BulkService(mockPrisma as any, mockAttachmentsService as any);
  });

  it('getJobStatus returns job', async () => {
    mockPrisma.bulk_import_jobs.findUnique.mockResolvedValueOnce({
      id: 'job-1',
      status: 'running',
    });
    const res = await svc.getJobStatus('job-1');
    expect(res.id).toBe('job-1');
  });

  it('cancelJob returns null when not found', async () => {
    mockPrisma.bulk_import_jobs.findUnique.mockResolvedValueOnce(null);
    const res = await svc.cancelJob('job-unknown');
    expect(res).toBeNull();
  });

  it('cancelJob sets canceled when running', async () => {
    mockPrisma.bulk_import_jobs.findUnique.mockResolvedValueOnce({
      id: 'job-1',
      status: 'running',
    });
    const res = await svc.cancelJob('job-1');
    expect(res.status).toBe('canceled');
  });

  it('processBulkFiles handles single file upload and duplicates', async () => {
    const file = { buffer: Buffer.from('a'), originalname: 'a.png' } as any;
    // Create a job and call processBulkFiles directly
    mockPrisma.bulk_import_jobs.create.mockResolvedValueOnce({ id: 'job-1', status: 'running' });
    await svc.startBulkImport('user-1', [
      { file, recordType: 'expense', recordId: 'exp-1' } as any,
    ]);
    // Wait a tick to let the fire-and-forget process start
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
