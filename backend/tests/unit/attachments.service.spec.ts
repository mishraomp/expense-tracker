import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttachmentsService } from '../../src/modules/attachments/attachments.service';
import { sha256Hex } from '../../src/common/utils/checksum';

function makeMockPrisma() {
  const attachments: any[] = [];
  return {
    expense: { findUnique: vi.fn() },
    income: { findUnique: vi.fn() },
    attachments: {
      create: vi.fn(async ({ data }: any) => ({ id: 'att-1', ...data })),
      findMany: vi.fn(async ({ where }: any) =>
        attachments.filter(
          (a) =>
            a.linked_expense_id === where.linked_expense_id ||
            a.linked_income_id === where.linked_income_id,
        ),
      ),
      findUnique: vi.fn(
        async ({ where }: any) => attachments.find((a) => a.id === where.id) || null,
      ),
      update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    },
  } as any;
}

describe('AttachmentsService', () => {
  let mockPrisma: any;
  let mockLimitCheck: any;
  let mockDrive: any;
  let svc: AttachmentsService;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
    mockLimitCheck = { assertCanAttach: vi.fn(async () => undefined) };
    mockDrive = {
      createUserFolderIfMissing: vi.fn(async () => undefined),
      uploadFile: vi.fn(async (args: any) => ({
        driveFileId: 'df-1',
        webViewLink: 'https://go',
        mimeType: args.mimeType,
        sizeBytes: args.buffer.length,
        originalFilename: args.filename,
      })),
      deleteFile: vi.fn(async () => undefined),
    };
    svc = new AttachmentsService(mockPrisma, mockLimitCheck, mockDrive);
  });

  it('uploadAttachment succeeds for expense', async () => {
    const expense = {
      id: 'exp-1',
      userId: 'user-1',
      date: new Date(),
      amount: 100,
      categoryId: 'cat-1',
    };
    mockPrisma.expense.findUnique.mockResolvedValue(expense);

    const file: any = {
      originalname: 'a.png',
      buffer: Buffer.from('abcd'),
      mimetype: 'image/png',
      size: 4,
    };
    const checksum = sha256Hex(file.buffer);

    const result = await svc.uploadAttachment({
      recordType: 'expense',
      recordId: 'exp-1',
      file,
      checksum,
    });
    expect(result).toBeDefined();
    expect(mockDrive.createUserFolderIfMissing).toHaveBeenCalledWith(expense.userId);
    expect(mockPrisma.attachments.create).toHaveBeenCalled();
    expect(result.original_filename).toBeDefined();
  });

  it('listAttachments returns only active', async () => {
    // mock attachments: must use the mockPrisma attachments.findMany to return rows
    const row = {
      id: 'att-2',
      original_filename: 'foo.csv',
      mime_type: 'text/csv',
      size_bytes: 100,
      web_view_link: 'https://go',
      status: 'ACTIVE',
      linked_expense_id: 'exp-1',
      created_at: new Date(),
    };
    mockPrisma.attachments.findMany.mockResolvedValue([row]);
    const res = await svc.listAttachments('expense', 'exp-1');
    expect(res).toHaveLength(1);
    expect(res[0].originalFilename).toBe('foo.csv');
  });

  it('replaceAttachment creates new record and marks old removed', async () => {
    const oldAttachment = {
      id: 'att-old',
      status: 'ACTIVE',
      linked_expense_id: 'exp-1',
      linked_income_id: null,
      drive_record_type: 'EXPENSE',
      drive_record_date: new Date(),
      drive_amount_minor_units: BigInt(100),
      drive_category_id: 'cat-1',
    };
    mockPrisma.attachments.findUnique.mockResolvedValueOnce(oldAttachment);
    const expense = {
      id: 'exp-1',
      userId: 'user-1',
      date: new Date(),
      amount: 100,
      categoryId: 'cat-1',
    };
    mockPrisma.expense.findUnique = vi.fn(async ({ where }: any) => expense);
    const file: any = {
      originalname: 'b.png',
      buffer: Buffer.from('abc'),
      mimetype: 'image/png',
      size: 3,
    };

    const newAtt = await svc.replaceAttachment('att-old', file, 'checksum');
    expect(newAtt).toBeDefined();
    expect(mockPrisma.attachments.create).toHaveBeenCalled();
    expect(mockPrisma.attachments.update).toHaveBeenCalled();
  });

  it('removeAttachment marks removed and sets retention', async () => {
    const attachment = {
      id: 'att-remove',
      original_filename: 'file.txt',
      status: 'ACTIVE',
      retention_expires_at: null,
    };
    mockPrisma.attachments.findUnique.mockResolvedValue(attachment);
    mockPrisma.attachments.update.mockResolvedValue({
      ...attachment,
      status: 'REMOVED',
      retention_expires_at: new Date(),
    });

    const res = await svc.removeAttachment('att-remove');
    expect(res.status).toBe('REMOVED');
    expect(mockPrisma.attachments.update).toHaveBeenCalled();
  });
});
