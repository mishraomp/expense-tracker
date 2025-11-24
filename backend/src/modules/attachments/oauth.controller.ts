import { Controller, Post, Body, Get, Req, HttpCode, Delete } from '@nestjs/common';
import { OAuthService } from './oauth.service';

@Controller({ path: 'drive/oauth', version: '1' })
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  /** Returns Google consent screen URL */
  @Get('authorize')
  @HttpCode(200)
  authorize(): { url: string } {
    return { url: this.oauthService.buildAuthorizationUrl() };
  }

  /** Exchanges auth code for tokens and stores encrypted refresh token */
  @Post('exchange')
  @HttpCode(200)
  async exchange(
    @Req() req: any,
    @Body() body: { code: string },
  ): Promise<{ accessToken: string; expiresAt?: number; refreshStored: boolean }> {
    const userId = req.user?.id || req.user?.sub; // depends on auth guard
    if (!userId) {
      throw new Error('User context missing');
    }
    const result = await this.oauthService.exchangeCode(userId, body.code);
    return result; // { accessToken, expiresAt, refreshStored }
  }

  /** Revokes Drive access */
  @Delete('revoke')
  @HttpCode(200)
  async revoke(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('User context missing');
    }
    await this.oauthService.revoke(userId);
    return { success: true };
  }

  /** Status endpoint to tell frontend if connected */
  @Get('status')
  @HttpCode(200)
  async status(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) return { connected: false };
    // Simple existence check (no token validation ping to Google)
    try {
      // Will throw if not connected
      await this.oauthService.getAccessToken(userId);
      return { connected: true };
    } catch {
      return { connected: false };
    }
  }
}
