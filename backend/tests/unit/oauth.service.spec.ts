import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OAuthService } from '../../src/modules/attachments/oauth.service';
import { BadRequestException } from '@nestjs/common';

// Mock googleapis
vi.mock('googleapis', () => {
  const authMock = {
    OAuth2: vi.fn().mockImplementation(function () {
      return {
        generateAuthUrl: () => 'https://example.com/oauth',
        getToken: async (code: string) => ({
          tokens: { access_token: 'atk', refresh_token: 'rt', expiry_date: 1234 },
        }),
        setCredentials: (c: any) => undefined,
        getAccessToken: async () => ({ token: 'access-token' }),
        revokeToken: async (token: string) => undefined,
      };
    }),
  };
  return { google: { auth: authMock } };
});

// Mock EncryptionUtil
vi.mock('../../src/common/security/encryption.util', () => ({
  EncryptionUtil: {
    encrypt: (s: string) => `enc(${s})`,
    decrypt: (s: string) => s.replace(/^enc\(|\)$/g, ''),
  },
}));

describe('OAuthService', () => {
  let oauth: OAuthService;
  const mockPrisma: any = {
    user_drive_auth: {
      upsert: vi.fn(async (args) => ({ ...args.create })),
      findUnique: vi.fn(async (args) => undefined),
      update: vi.fn(async (args) => args.data),
      delete: vi.fn(async (args) => undefined),
    },
  };

  beforeEach(() => {
    process.env.GOOGLE_DRIVE_CLIENT_ID = 'id';
    process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'secret';
    process.env.GOOGLE_DRIVE_REDIRECT_URI = 'https://example.com/oauth/callback';
    oauth = new OAuthService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;
    delete process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    delete process.env.GOOGLE_DRIVE_REDIRECT_URI;
  });

  it('buildAuthorizationUrl should return url', () => {
    const url = oauth.buildAuthorizationUrl();
    expect(url).toBe('https://example.com/oauth');
  });

  it('exchangeCode without code should throw', async () => {
    await expect(oauth.exchangeCode('user-1', '')).rejects.toThrow(BadRequestException);
  });

  it('exchangeCode with refresh_token should store token', async () => {
    const res = await oauth.exchangeCode('user-1', 'code');
    expect(res.accessToken).toBe('atk');
    expect(res.refreshStored).toBe(true);
    expect(mockPrisma.user_drive_auth.upsert).toHaveBeenCalled();
  });

  it('getAccessToken without existing row throws', async () => {
    mockPrisma.user_drive_auth.findUnique.mockResolvedValue(null);
    await expect(oauth.getAccessToken('user-2')).rejects.toThrow(BadRequestException);
  });

  it('getAccessToken with existing row returns token and updates validation date', async () => {
    mockPrisma.user_drive_auth.findUnique.mockResolvedValue({ encrypted_refresh_token: 'enc(rt)' });
    const tok = await oauth.getAccessToken('user-1');
    expect(tok).toBe('access-token');
    expect(mockPrisma.user_drive_auth.update).toHaveBeenCalled();
  });

  it('revoke will delete stored token and call google revoke', async () => {
    mockPrisma.user_drive_auth.findUnique.mockResolvedValue({ encrypted_refresh_token: 'enc(rt)' });
    await oauth.revoke('user-1');
    expect(mockPrisma.user_drive_auth.delete).toHaveBeenCalled();
  });
});
