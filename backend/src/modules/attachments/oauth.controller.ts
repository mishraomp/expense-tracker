import { Controller, Post, Body, Get, Req, HttpCode, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OAuthService } from './oauth.service';

@ApiBearerAuth('bearer')
@ApiTags('Drive OAuth')
@Controller({ path: 'drive/oauth', version: '1' })
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  /**
   * Returns a Google OAuth consent screen URL that a human must open in a browser and
   * complete. NOT SUITABLE for programmatic/LLM tool calling — there's nothing actionable to
   * do with the URL string alone.
   */
  @Get('authorize')
  @ApiOperation({
    summary: 'Get the Google Drive authorization URL',
    description:
      'Returns a Google OAuth consent screen URL that a human must open in a browser and ' +
      "complete. NOT SUITABLE for programmatic/LLM tool calling — there's nothing actionable to " +
      'do with the URL string alone.',
  })
  @ApiOkResponse({
    description: 'The authorization URL to open in a browser.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', description: 'Google OAuth consent screen URL.' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Exchange a Google authorization code',
    description:
      'Exchanges a Google-issued authorization code for tokens. NOT SUITABLE for ' +
      'programmatic/LLM tool calling — the code is single-use, short-lived, and obtainable only ' +
      "via the browser redirect from Google's consent screen; an LLM cannot obtain it independently.",
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { type: 'string', description: "Authorization code from Google's OAuth redirect." },
      },
    },
  })
  @ApiOkResponse({
    description: 'Tokens were exchanged and the refresh token was stored for future API calls.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'Short-lived Google access token.' },
        expiresAt: {
          type: 'integer',
          format: 'int64',
          nullable: true,
          description: 'Unix epoch seconds when accessToken expires, if Google returned one.',
        },
        refreshStored: {
          type: 'boolean',
          description: "Whether a refresh token was persisted for this user's future Drive calls.",
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Revoke the Google Drive connection',
    description:
      "Deletes the caller's stored Google Drive refresh token, disconnecting the account.",
  })
  @ApiOkResponse({
    description: 'The connection was revoked.',
    schema: { type: 'object', properties: { success: { type: 'boolean', example: true } } },
  })
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
  @ApiOperation({
    summary: 'Check Google Drive connection status',
    description:
      'Checks whether the caller has a connected Google Drive account. This DOES contact ' +
      'Google (it mints a fresh access token from the stored refresh token on every call) — it ' +
      'can be slow, fail, or be rate-limited if Google is unreachable or the refresh token was revoked.',
  })
  @ApiOkResponse({
    description: 'Connection status.',
    schema: { type: 'object', properties: { connected: { type: 'boolean' } } },
  })
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
