import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, {
  uploadAttachment,
  listAttachments,
  replaceAttachment,
  removeAttachment,
  startBulkImport,
  getBulkJobStatus,
  getOrphans,
  exchangeDriveCode,
  getDriveAuthorizeUrl,
  getDriveStatus,
  revokeDriveAccess,
} from '@/services/api';

describe('api service', () => {
  beforeEach(() => {
    // ensure we can spy on api instance methods
    vi.restoreAllMocks();
  });

  it('uploadAttachment calls post', async () => {
    const spy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: {} } as any);
    const form = new FormData();
    await uploadAttachment(form);
    expect(spy).toHaveBeenCalledWith('/attachments', form, expect.any(Object));
  });

  it('listAttachments calls get', async () => {
    const spy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { data: [] } } as any);
    await listAttachments('expense', 'e1');
    expect(spy).toHaveBeenCalledWith('/attachments/records/expense/e1/attachments');
  });

  it('replaceAttachment adds checksum when provided', async () => {
    const spy = vi.spyOn(api, 'put').mockResolvedValueOnce({ data: {} } as any);
    const file = new File(['a'], 'a.png');
    await replaceAttachment('att-1', file, 'chk');
    expect(spy).toHaveBeenCalled();
  });

  it('removeAttachment calls delete', async () => {
    const spy = vi.spyOn(api, 'delete').mockResolvedValueOnce({ data: {} } as any);
    await removeAttachment('att-1');
    expect(spy).toHaveBeenCalledWith('/attachments/att-1');
  });

  it('startBulkImport posts and returns data', async () => {
    const spy = vi
      .spyOn(api, 'post')
      .mockResolvedValueOnce({ data: { data: { jobId: 'j1' } } } as any);
    const f = new File(['a'], 'a.txt');
    const res = await startBulkImport('expense', [f], ['e1']);
    expect(spy).toHaveBeenCalled();
    expect(res.jobId).toBe('j1');
  });

  it('getBulkJobStatus calls get and returns job data', async () => {
    const spy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { data: { id: 'j1' } } } as any);
    const res = await getBulkJobStatus('j1');
    expect(spy).toHaveBeenCalledWith('/attachments/bulk/j1');
    expect(res.id).toBe('j1');
  });

  it('getOrphans queries and returns list', async () => {
    const spy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { data: { orphans: [1] } } } as any);
    const out = await getOrphans();
    expect(spy).toHaveBeenCalled();
    expect(out.length).toBeGreaterThan(0);
  });

  it('drive authorize & status', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { url: 'http://x' } } as any);
    const url = await getDriveAuthorizeUrl();
    expect(url).toBe('http://x');
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { connected: true } } as any);
    const status = await getDriveStatus();
    expect(status).toBe(true);
    vi.spyOn(api, 'delete').mockResolvedValueOnce({ data: { success: true } } as any);
    const revoked = await revokeDriveAccess();
    expect(revoked).toBe(true);
  });

  it('exchangeDriveCode calls post', async () => {
    const spy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { data: {} } } as any);
    await exchangeDriveCode('code');
    expect(spy).toHaveBeenCalledWith('/drive/oauth/exchange', { code: 'code' });
  });
});
