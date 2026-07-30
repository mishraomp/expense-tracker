import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  OnModuleInit,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { timingSafeEqual } from 'crypto';
import { UsersService } from '../../modules/users/users.service';

interface KeycloakTokenPayload {
  sub: string; // Keycloak user ID
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  exp: number;
  iat: number;
  iss: string;
  aud: string | string[];
}

@Injectable()
export class KeycloakAuthGuard implements CanActivate, OnModuleInit {
  private jwksClientInstance: jwksClient.JwksClient;
  private readonly logger = new Logger(KeycloakAuthGuard.name);
  private keycloakUrl: string;
  private realm: string;
  private clientId: string;

  constructor(
    private configService: ConfigService,
    @Inject(UsersService) private usersService: UsersService,
  ) {}

  onModuleInit() {
    this.keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    this.realm = this.configService.get<string>('KEYCLOAK_REALM');
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID_API');

    if (!this.keycloakUrl || !this.realm || !this.clientId) {
      this.logger.error(
        'Keycloak configuration missing. Set KEYCLOAK_URL, KEYCLOAK_REALM, and KEYCLOAK_CLIENT_ID_API',
      );
      throw new Error('Keycloak configuration incomplete');
    }

    const jwksUri = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
    this.logger.log(`Initializing JWKS client with URI: ${jwksUri}`);

    this.jwksClientInstance = new jwksClient.JwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 600000, // Cache keys for 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const bypassed = await this.tryLocalBypass(request);
    if (bypassed) {
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = await this.validateToken(token);

      // Ensure user exists in our database (create if first login)
      const user = await this.usersService.findOrCreateUser({
        sub: decoded.sub,
        email: decoded.email,
        given_name: decoded.given_name,
        family_name: decoded.family_name,
      });

      // Attach user info to request for use in controllers
      // Use our database user ID (not Keycloak sub) for foreign keys
      request.user = {
        sub: user.id, // Use our database user.id
        keycloakSub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        given_name: decoded.given_name,
        family_name: decoded.family_name,
      };

      return true;
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Local-only escape hatch for the expense-tracker MCP server: a fixed shared
   * secret takes the place of a real Keycloak token so a stdio-spawned local
   * process never has to hold a password or manage token refresh. Only active
   * when MCP_LOCAL_BYPASS_SECRET is set — never set this outside local dev.
   */
  private async tryLocalBypass(request: any): Promise<boolean> {
    const bypassSecret = this.configService.get<string>('MCP_LOCAL_BYPASS_SECRET');
    const providedSecret = request.headers['x-mcp-bypass-secret'];

    if (!bypassSecret || typeof providedSecret !== 'string') {
      return false;
    }
    if (!this.secretsMatch(providedSecret, bypassSecret)) {
      return false;
    }

    const bypassEmail = this.configService.get<string>('MCP_LOCAL_BYPASS_USER_EMAIL');
    if (!bypassEmail) {
      throw new UnauthorizedException('MCP_LOCAL_BYPASS_USER_EMAIL is not configured');
    }

    const user = await this.usersService.findByEmail(bypassEmail);
    if (!user) {
      throw new UnauthorizedException(
        `MCP bypass user '${bypassEmail}' not found - log in via the web app once first`,
      );
    }

    this.logger.warn(`Request authenticated via MCP local bypass as ${user.email}`);
    request.user = {
      sub: user.id,
      keycloakSub: user.keycloakSub,
      email: user.email,
      name: undefined,
      given_name: user.firstName,
      family_name: user.lastName,
    };
    return true;
  }

  private secretsMatch(provided: string, expected: string): boolean {
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);
    if (providedBuf.length !== expectedBuf.length) {
      return false;
    }
    return timingSafeEqual(providedBuf, expectedBuf);
  }

  private async validateToken(token: string): Promise<KeycloakTokenPayload> {
    // Decode token header to get 'kid' (key ID)
    const decoded = jwt.decode(token, { complete: true }) as any;

    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new Error('Invalid token structure');
    }

    // Get signing key from JWKS
    const key = await this.getSigningKey(decoded.header.kid);

    // Verify and decode token
    // Note: Public clients (like expense-tracker-web) get tokens with audience: 'account'
    // We accept both 'account' and the API client ID
    const payload = jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer: `${this.keycloakUrl}/realms/${this.realm}`,
      // Accept either 'account' (for public client tokens) or the API client ID
    }) as KeycloakTokenPayload;

    // Manually validate audience since we accept multiple values
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const validAudiences = ['account', this.clientId];
    const hasValidAudience = audiences.some((aud) => validAudiences.includes(aud));

    if (!hasValidAudience) {
      throw new Error(
        `Invalid audience. Expected one of: ${validAudiences.join(', ')}, got: ${audiences.join(', ')}`,
      );
    }

    return payload;
  }

  private async getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClientInstance.getSigningKey(kid, (err, key) => {
        if (err) {
          return reject(err);
        }

        const signingKey = key.getPublicKey();
        resolve(signingKey);
      });
    });
  }
}
