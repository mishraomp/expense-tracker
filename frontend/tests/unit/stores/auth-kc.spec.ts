import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Keycloak module before importing the auth store
vi.mock('@/services/keycloak', () => {
  const mk = {
    token: 'tok-123',
    tokenParsed: {
      preferred_username: 'user1',
      display_name: 'User One',
      name: 'User One',
      email: 'user1@example.com',
      client_roles: ['admin'],
      aud: 'expense-tracker-web',
    },
    refreshToken: 'ref-123',
    clientId: 'expense-tracker-web',
    authServerUrl: 'http://localhost:8080',
    realm: 'expense-tracker',
    init: vi.fn(async () => true),
    login: vi.fn(async () => true),
    logout: vi.fn(async () => true),
    updateToken: vi.fn(async (minValidity = 5) => true),
    onTokenExpired: undefined,
  } as any;
  return { default: mk };
});

import { useAuthStore, AUTH_TOKEN } from '@/stores/auth';

describe('auth store with mocked Keycloak', () => {
  beforeEach(() => {
    // Reset store state and localStorage
    useAuthStore.setState({
      isInitialized: false,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      refreshToken: null,
      userInfo: {},
      error: null,
      refreshIntervalId: null,
    });
    localStorage.removeItem(AUTH_TOKEN);
    vi.clearAllMocks();
  });

  it('initKeycloak succeeds and sets auth state and token refresh', async () => {
    const { default: mockKeycloak } = await import('@/services/keycloak');
    // Ensure init returns true
    (mockKeycloak.init as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await useAuthStore.getState().initKeycloak();
    expect(result).toBe(true);

    const state = useAuthStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe(mockKeycloak.token);
    expect(localStorage.getItem(AUTH_TOKEN)).toBe(mockKeycloak.token);
    // Verify that onTokenExpired handler was set
    expect(typeof mockKeycloak.onTokenExpired).toBe('function');
  });

  it('updateToken success path calls updateAuthState', async () => {
    // spy on updateAuthState
    const spy = vi.spyOn(useAuthStore.getState(), 'updateAuthState');
    const { default: mockKeycloak } = await import('@/services/keycloak');
    (mockKeycloak.updateToken as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await useAuthStore.getState().updateToken(5);
    expect(res).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('updateToken failure triggers logout and returns false', async () => {
    const spy = vi.spyOn(useAuthStore.getState(), 'logout');
    const { default: mockKeycloak } = await import('@/services/keycloak');
    (mockKeycloak.updateToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const res = await useAuthStore.getState().updateToken(5);
    expect(res).toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it('initKeycloak when not authenticated triggers login and returns false', async () => {
    const { default: mockKeycloak } = await import('@/services/keycloak');
    (mockKeycloak.init as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (mockKeycloak.login as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await useAuthStore.getState().initKeycloak();
    expect(result).toBe(false);
    expect(mockKeycloak.login).toHaveBeenCalled();
  });

  it('initKeycloak failure sets error and returns false', async () => {
    const { default: mockKeycloak } = await import('@/services/keycloak');
    (mockKeycloak.init as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('init fail'));

    const result = await useAuthStore.getState().initKeycloak();
    expect(result).toBe(false);
    expect(useAuthStore.getState().error).toBe('init fail');
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('login failure sets error', async () => {
    const { default: mockKeycloak } = await import('@/services/keycloak');
    (mockKeycloak.login as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('login fail'));

    await useAuthStore.getState().login();
    expect(useAuthStore.getState().error).toContain('login fail');
  });

  it('logout failure sets error', async () => {
    const { default: mockKeycloak } = await import('@/services/keycloak');
    (mockKeycloak.logout as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('logout fail'));

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().error).toContain('logout fail');
  });

  it('validateAudience returns false on mismatch aud', async () => {
    const { default: mockKeycloak } = await import('@/services/keycloak');
    mockKeycloak.clientId = 'a-client-id';
    mockKeycloak.tokenParsed = { aud: 'other-client' } as any;
    expect(useAuthStore.getState().validateAudience()).toBe(false);
  });

  it('background startTokenRefresh triggers updateToken calls', async () => {
    const { default: mockKeycloak } = await import('@/services/keycloak');
    // ensure authenticated + token exists
    useAuthStore.setState({ isAuthenticated: true, token: 'tkn' });
    // spy on updateAuthState
    const spyState = vi.spyOn(useAuthStore.getState(), 'updateAuthState');
    (mockKeycloak.updateToken as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    vi.useFakeTimers();
    useAuthStore.getState().startTokenRefresh();
    // advance time to trigger interval handler
    vi.runOnlyPendingTimers();
    await Promise.resolve(); // flush pending promises
    expect(spyState).toHaveBeenCalled();
    // cleanup
    useAuthStore.getState().stopTokenRefresh();
    vi.useRealTimers();
  });

  it('validateAudience returns false when client id missing or token parsed missing', async () => {
    const { default: mockKeycloak } = await import('@/services/keycloak');
    // no clientId
    mockKeycloak.clientId = '' as unknown as string;
    expect(useAuthStore.getState().validateAudience()).toBe(false);
    mockKeycloak.clientId = 'expense-tracker-web';

    // missing token parsed
    (mockKeycloak as any).tokenParsed = null;
    expect(useAuthStore.getState().validateAudience()).toBe(false);
  });

  it('checkSSO success path', async () => {
    const { default: mockKeycloak } = await import('@/services/keycloak');
    (mockKeycloak.init as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const spyUpdateAuth = vi.spyOn(useAuthStore.getState(), 'updateAuthState');
    const spyStart = vi.spyOn(useAuthStore.getState(), 'startTokenRefresh');

    const res = await useAuthStore.getState().checkSSO();
    expect(res).toBe(true);
    expect(spyUpdateAuth).toHaveBeenCalled();
    expect(spyStart).toHaveBeenCalled();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });
});
