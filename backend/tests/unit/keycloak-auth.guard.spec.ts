import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { KeycloakAuthGuard } from '../../src/common/guards/keycloak-auth.guard';

describe('KeycloakAuthGuard - MCP local bypass', () => {
  let mockConfig: any;
  let mockUsersService: any;
  let guard: KeycloakAuthGuard;
  let configValues: Record<string, string | undefined>;

  const BYPASS_USER = {
    id: 'user-1',
    email: 'omprakashmishra3978@gmail.com',
    keycloakSub: 'kc-sub-1',
    firstName: 'Om',
    lastName: 'Mishra',
  };

  function makeContext(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    configValues = {
      MCP_LOCAL_BYPASS_SECRET: 'test-secret',
      MCP_LOCAL_BYPASS_USER_EMAIL: BYPASS_USER.email,
    };
    mockConfig = { get: vi.fn((key: string) => configValues[key]) };
    mockUsersService = {
      findByEmail: vi.fn(async () => BYPASS_USER),
      findOrCreateUser: vi.fn(),
    };
    guard = new KeycloakAuthGuard(mockConfig, mockUsersService);
  });

  it('bypasses JWT verification when the secret header matches', async () => {
    const request: any = { headers: { 'x-mcp-bypass-secret': 'test-secret' } };
    const result = await guard.canActivate(makeContext(request));

    expect(result).toBe(true);
    expect(mockUsersService.findByEmail).toHaveBeenCalledWith(BYPASS_USER.email);
    expect(request.user).toMatchObject({
      sub: BYPASS_USER.id,
      keycloakSub: BYPASS_USER.keycloakSub,
      email: BYPASS_USER.email,
    });
  });

  it('falls through to the normal JWT path when the secret does not match', async () => {
    const request: any = { headers: { 'x-mcp-bypass-secret': 'wrong-secret' } };

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
    expect(mockUsersService.findByEmail).not.toHaveBeenCalled();
  });

  it('falls through to the normal JWT path when MCP_LOCAL_BYPASS_SECRET is unset', async () => {
    configValues.MCP_LOCAL_BYPASS_SECRET = undefined;
    const request: any = { headers: { 'x-mcp-bypass-secret': 'test-secret' } };

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
    expect(mockUsersService.findByEmail).not.toHaveBeenCalled();
  });

  it('falls through when no bypass header is present at all', async () => {
    const request: any = { headers: {} };

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
    expect(mockUsersService.findByEmail).not.toHaveBeenCalled();
  });

  it('throws if the secret matches but the configured bypass user does not exist', async () => {
    mockUsersService.findByEmail = vi.fn(async () => null);
    const request: any = { headers: { 'x-mcp-bypass-secret': 'test-secret' } };

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
      /MCP bypass user .* not found/,
    );
  });

  it('ignores a non-string header value instead of crashing', async () => {
    const request: any = { headers: { 'x-mcp-bypass-secret': ['test-secret', 'test-secret'] } };

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
    expect(mockUsersService.findByEmail).not.toHaveBeenCalled();
  });
});
