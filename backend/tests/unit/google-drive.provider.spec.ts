import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleDriveProvider } from '../../src/modules/attachments/providers/google-drive.provider';
import { OAuthService } from '../../src/modules/attachments/oauth.service';

// Mock googleapis drive
vi.mock('googleapis', () => {
  const filesMock = {
    list: vi.fn(async (args: any) => ({ data: { files: [] } })),
    create: vi.fn(async (args: any) => ({
      data: {
        id: 'drive-id-1',
        name: args.requestBody.name,
        mimeType: args.requestBody.mimeType || 'image/png',
        size: '123',
        webViewLink: 'https://drive.google.com/file/d/drive-id-1/view',
      },
    })),
    delete: vi.fn(async (args: any) => ({ data: {} })),
  };
  return {
    google: {
      drive: vi.fn().mockImplementation((opts: any) => ({ files: filesMock })),
    },
  };
});

describe('GoogleDriveProvider', () => {
  let provider: GoogleDriveProvider;

  const mockOAuth: Partial<OAuthService> = {
    getAuthorizedClient: vi.fn(async (userId: string) => ({ userId }) as any),
  };

  beforeEach(() => {
    provider = new GoogleDriveProvider(mockOAuth as OAuthService);
  });

  it('ensureUserRootFolder create when missing', async () => {
    const id = await (provider as any).ensureUserRootFolder('user-foo');
    expect(id).toBe('drive-id-1');
    // ensure cached
    const id2 = await (provider as any).ensureUserRootFolder('user-foo');
    expect(id2).toBe('drive-id-1');
  });

  it('createUserFolderIfMissing calls ensure', async () => {
    await provider.createUserFolderIfMissing('user-foo');
  });

  it('uploadFile returns upload result', async () => {
    const res = await provider.uploadFile({
      userId: 'user-foo',
      buffer: Buffer.from('abc'),
      filename: 'test.png',
      mimeType: 'image/png',
      recordType: 'expense',
      recordId: 'rec1',
    });
    expect(res.driveFileId).toBe('drive-id-1');
    expect(res.originalFilename).toBe('test.png');
  });

  it('listUserFiles returns mapped files', async () => {
    const files = await provider.listUserFiles('user-foo');
    expect(Array.isArray(files)).toBe(true);
  });

  it('deleteFile calls API', async () => {
    await provider.deleteFile('user-foo', 'drive-id-1');
  });
});
