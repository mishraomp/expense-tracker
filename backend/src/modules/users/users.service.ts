import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find or create user based on Keycloak token payload
   * This ensures the user exists in our database before accessing other resources
   */
  async findOrCreateUser(keycloakData: {
    sub: string;
    email?: string;
    given_name?: string;
    family_name?: string;
  }) {
    // Try to find existing user by keycloakSub
    let user = await this.prisma.user.findUnique({
      where: { keycloakSub: keycloakData.sub },
    });

    if (!user && keycloakData.email) {
      // May already exist via the MCP local-bypass path (which has no keycloakSub
      // yet, since it never goes through a real Keycloak login). Attach the real
      // sub to that row instead of colliding on the unique email constraint.
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: keycloakData.email },
      });
      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { keycloakSub: keycloakData.sub },
        });
      }
    }

    if (!user) {
      // Create new user from Keycloak data
      user = await this.prisma.user.create({
        data: {
          keycloakSub: keycloakData.sub,
          email: keycloakData.email || `user-${keycloakData.sub}@unknown.com`,
          firstName: keycloakData.given_name,
          lastName: keycloakData.family_name,
        },
      });
    }

    return user;
  }

  /**
   * Look up a user by email with no Keycloak token involved.
   * Used by the MCP local-bypass auth path, which has no keycloakSub to key off.
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
