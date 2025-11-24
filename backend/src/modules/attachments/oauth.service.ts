import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionUtil } from '../../common/security/encryption.util';

interface ExchangeResult {
  accessToken: string;
  expiresAt?: number; // epoch ms
  refreshStored: boolean;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(private prisma: PrismaService) {}

  private getClient() {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Missing Google Drive OAuth env vars (GOOGLE_DRIVE_CLIENT_ID / SECRET / REDIRECT_URI)',
      );
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /** Build authorization URL for user consent */
  buildAuthorizationUrl(): string {
    const oauth2 = this.getClient();
    return oauth2.generateAuthUrl({
      access_type: 'offline', // ensures refresh token on first consent
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });
  }

  /** Exchange code for tokens, store refresh token encrypted */
  async exchangeCode(userId: string, code: string): Promise<ExchangeResult> {
    if (!code) throw new BadRequestException('Missing authorization code');
    const oauth2 = this.getClient();
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.access_token) {
      throw new BadRequestException('Failed to obtain access token from Google');
    }

    let refreshStored = false;
    if (tokens.refresh_token) {
      const encrypted = EncryptionUtil.encrypt(tokens.refresh_token);
      await this.prisma.user_drive_auth.upsert({
        where: { user_id: userId },
        update: {
          encrypted_refresh_token: encrypted,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
          last_validated_at: new Date(),
        },
        create: {
          user_id: userId,
          encrypted_refresh_token: encrypted,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        },
      });
      refreshStored = true;
    } else {
      // If user previously consented, Google may not resend refresh_token; ensure row exists
      const existing = await this.prisma.user_drive_auth.findUnique({ where: { user_id: userId } });
      if (!existing) {
        this.logger.warn(`No refresh token received for user ${userId}`);
      }
    }

    return {
      accessToken: tokens.access_token,
      expiresAt: tokens.expiry_date,
      refreshStored,
    };
  }

  /** Obtain fresh access token using stored refresh token */
  async getAccessToken(userId: string): Promise<string> {
    const row = await this.prisma.user_drive_auth.findUnique({ where: { user_id: userId } });
    if (!row) throw new BadRequestException('Google Drive not connected');
    const refreshToken = EncryptionUtil.decrypt(row.encrypted_refresh_token);
    const oauth2 = this.getClient();
    oauth2.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth2.getAccessToken();
    if (!token) throw new BadRequestException('Failed to refresh access token');
    // Update validated timestamp
    await this.prisma.user_drive_auth.update({
      where: { user_id: userId },
      data: { last_validated_at: new Date() },
    });
    return token;
  }

  /** Get authorized OAuth2 client for Drive API */
  async getAuthorizedClient(userId: string) {
    const accessToken = await this.getAccessToken(userId);
    const oauth2 = this.getClient();
    oauth2.setCredentials({ access_token: accessToken });
    return oauth2;
  }

  async revoke(userId: string): Promise<void> {
    const row = await this.prisma.user_drive_auth.findUnique({ where: { user_id: userId } });
    if (!row) return; // already revoked
    // Attempt to revoke with Google (best effort)
    try {
      const refreshToken = EncryptionUtil.decrypt(row.encrypted_refresh_token);
      const oauth2 = this.getClient();
      oauth2.setCredentials({ refresh_token: refreshToken });
      if (refreshToken) await oauth2.revokeToken(refreshToken);
    } catch (e) {
      this.logger.warn(`Token revoke failed for user ${userId}: ${(e as Error).message}`);
    }
    await this.prisma.user_drive_auth.delete({ where: { user_id: userId } });
  }
}
