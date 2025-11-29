import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDriveStore } from '@/stores/drive';
import * as api from '@/services/api';

vi.mock('@/services/api', async () => {
  return {
    getDriveAuthorizeUrl: vi.fn(async () => 'https://example.com/oauth'),
    exchangeDriveCode: vi.fn(async (code: string) => ({ data: { accessToken: 'atk' } })),
    // The real API returns booleans (getDriveStatus -> boolean, revokeDriveAccess -> boolean)
    getDriveStatus: vi.fn(async () => true),
    revokeDriveAccess: vi.fn(async () => true),
  };
});

describe('useDriveStore', () => {
  beforeEach(() => {
    // Reset store by recreating it if needed; Zustand devtools may need a reset
    useDriveStore.setState({ connected: false, connecting: false, error: null, lastUpdated: null });
    vi.clearAllMocks();
  });

  it('checkStatus updates connected flag', async () => {
    const r = await useDriveStore.getState().checkStatus();
    expect(typeof r === 'boolean').toBe(true);
    expect(useDriveStore.getState().connected).toBe(true);
  });

  it('checkStatus sets error on failure', async () => {
    // Replace the mock to throw
    (api.getDriveStatus as any).mockRejectedValueOnce(new Error('err'));
    const ret = await useDriveStore.getState().checkStatus();
    expect(ret).toBe(false);
    expect(useDriveStore.getState().error).toBe('err');
  });

  it('checkStatus deduplicates concurrent calls', async () => {
    // Make multiple concurrent calls
    const [r1, r2, r3] = await Promise.all([
      useDriveStore.getState().checkStatus(),
      useDriveStore.getState().checkStatus(),
      useDriveStore.getState().checkStatus(),
    ]);
    // All should return true
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(r3).toBe(true);
    // API should only be called once due to deduplication
    expect(api.getDriveStatus).toHaveBeenCalledTimes(1);
  });

  it('checkStatus uses cache within TTL', async () => {
    // First call
    await useDriveStore.getState().checkStatus();
    expect(api.getDriveStatus).toHaveBeenCalledTimes(1);

    // Second call should use cache (within 5s TTL)
    await useDriveStore.getState().checkStatus();
    expect(api.getDriveStatus).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it('beginConnect should redirect to authorize url', async () => {
    // Mock location change
    const origLoc = window.location;
    // @ts-ignore - writable assignment for test
    delete (window as any).location;
    (window as any).location = { href: '' };
    await useDriveStore.getState().beginConnect();
    expect((window as any).location.href).toBe('https://example.com/oauth');
    // restore
    (window as any).location = origLoc;
  });

  it('handleCallback sets connected true on success', async () => {
    const ok = await useDriveStore.getState().handleCallback('code');
    expect(ok).toBe(true);
    expect(useDriveStore.getState().connected).toBe(true);
  });

  it('revoke sets connected false on success', async () => {
    useDriveStore.setState({ connected: true });
    const r = await useDriveStore.getState().revoke();
    expect(r).toBe(true);
    expect(useDriveStore.getState().connected).toBe(false);
  });
});
