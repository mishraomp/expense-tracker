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
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
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

  it('findOrCreateUser attaches keycloakSub to an existing row found by email instead of duplicating it', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null) // no match by keycloakSub
      .mockResolvedValueOnce({ id: 'u3', email: 'bypass@example.com', keycloakSub: null }); // match by email

    const res = await svc.findOrCreateUser({ sub: 'sub-3', email: 'bypass@example.com' } as any);

    expect(res).toMatchObject({ id: 'u3', keycloakSub: 'sub-3' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u3' },
      data: { keycloakSub: 'sub-3' },
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});
