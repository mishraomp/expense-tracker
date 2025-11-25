import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '../../src/modules/users/users.service';

describe('UsersService', () => {
  let mockPrisma: any;
  let svc: UsersService;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(async ({ data }: any) => ({ id: 'u1', ...data })),
      },
    };
    svc = new UsersService(mockPrisma as any);
  });

  it('findOrCreateUser returns existing user', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', keycloakSub: 'sub-1' });
    const res = await svc.findOrCreateUser({ sub: 'sub-1' } as any);
    expect(res.id).toBe('u1');
  });

  it('findOrCreateUser creates when missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await svc.findOrCreateUser({ sub: 'sub-2', email: 'a@a.com' } as any);
    expect(res).toBeDefined();
  });
});
