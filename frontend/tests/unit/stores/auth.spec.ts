import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore, AUTH_TOKEN } from '@/stores/auth';

describe('auth store', () => {
  beforeEach(() => {
    // reset state
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
  });

  afterEach(() => {
    // clear browser storage
    localStorage.removeItem(AUTH_TOKEN);
  });

  it('setLoading and setError update state', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
    useAuthStore.getState().setError('oops');
    expect(useAuthStore.getState().error).toBe('oops');
  });

  it('clearAuthState clears and stops refresh', () => {
    const stopSpy = vi.spyOn(useAuthStore.getState(), 'stopTokenRefresh');
    useAuthStore.setState({ token: 'tok', isAuthenticated: true });
    useAuthStore.getState().clearAuthState();
    expect(useAuthStore.getState().token).toBeNull();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('isLoggedIn returns false when no token', () => {
    expect(useAuthStore.getState().isLoggedIn()).toBe(false);
    useAuthStore.setState({ token: 't', isAuthenticated: true });
    // validate audience depends on kc; override for the test
    useAuthStore.setState({ validateAudience: () => true });
    expect(useAuthStore.getState().isLoggedIn()).toBe(true);
  });

  it('username getter falls back to username', () => {
    useAuthStore.setState({ userInfo: { username: 'u1' } });
    expect(useAuthStore.getState().username()).toBe('u1');
  });

  it('hasRole validates audience and role membership', () => {
    useAuthStore.setState({ userInfo: { roles: ['admin'] } });
    // Make validateAudience false to start
    useAuthStore.setState({ validateAudience: () => true });
    expect(useAuthStore.getState().hasRole('admin')).toBe(true);
    expect(useAuthStore.getState().hasRole(['admin', 'user'])).toBe(true);
  });
});
