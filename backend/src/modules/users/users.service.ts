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
}
