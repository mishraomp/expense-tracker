import { Controller, Post, Body, Get, Req, HttpCode, Delete } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { OAuthService } from './oauth.service';

@ApiBearerAuth('bearer')
@Controller({ path: 'drive/oauth', version: '1' })
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  /**
   * Returns a Google OAuth consent screen URL that a human must open in a browser and
   * complete. NOT SUITABLE for programmatic/LLM tool calling — there's nothing actionable to
   * do with the URL string alone.
   */
  @Get('authorize')
  @HttpCode(200)
  authorize(): { url: string } {
    return { url: this.oauthService.buildAuthorizationUrl() };
  }

  /**
   * Exchanges a Google-issued authorization code for tokens. NOT SUITABLE for
   * programmatic/LLM tool calling — the code is single-use, short-lived, and obtainable only
   * via the browser redirect from Google's consent screen; an LLM cannot obtain it
   * independently.
   */
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

  /** Revokes the caller's stored Google Drive connection. */
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

  /**
   * Checks whether the caller has a connected Google Drive account. NOTE: despite what an
   * older comment here claimed, this DOES contact Google (it mints a fresh access token from
   * the stored refresh token on every call) — it can be slow, fail, or be rate-limited if
   * Google is unreachable or the refresh token was revoked.
   */
  @Get('status')
  @HttpCode(200)
  async status(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) return { connected: false };
    // NOTE: this DOES contact Google — getAccessToken() mints a fresh access token from the
    // stored refresh token on every call, it is not a local-only existence check.
    try {
      // Will throw if not connected
      await this.oauthService.getAccessToken(userId);
      return { connected: true };
    } catch {
      return { connected: false };
    }
  }
}
