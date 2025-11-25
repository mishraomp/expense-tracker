import { describe, it, expect, vi } from 'vitest';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

describe('api interceptors', () => {
  it('request interceptor attaches Authorization header when token available', async () => {
    // set token
    useAuthStore.setState({ token: 'TOKEN_X' });
    const reqHandler = (api as any).interceptors.request.handlers[0].fulfilled;
    const config: any = { headers: {} };
    const updated = await reqHandler(config);
    expect(updated.headers.Authorization).toBe('Bearer TOKEN_X');
  });

  it('response interceptor retries after successful updateToken on 401', async () => {
    const respHandler = (api as any).interceptors.response.handlers[0].rejected;
    // Mock updateToken to return true
    useAuthStore.setState({ updateToken: async () => true, login: async () => {} });
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({ data: {} } as any);
    const err = { response: { status: 401 }, config: {} } as any;
    await expect(respHandler(err)).resolves.toBeDefined();
    expect(requestSpy).toHaveBeenCalled();
    requestSpy.mockRestore();
  });

  it('response interceptor triggers login when updateToken fails', async () => {
    const respHandler = (api as any).interceptors.response.handlers[0].rejected;
    let loginCalled = false;
    useAuthStore.setState({
      updateToken: async () => false,
      login: async () => {
        loginCalled = true;
      },
    });
    const err = { response: { status: 401 }, config: {} } as any;
    await expect(respHandler(err)).rejects.toBeTruthy();
    expect(loginCalled).toBe(true);
  });
});
