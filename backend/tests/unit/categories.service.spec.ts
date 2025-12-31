import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { Prisma } from '@prisma/client';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('CategoriesService', () => {
  let mockPrisma: any;
  let svc: CategoriesService;

  beforeEach(() => {
    mockPrisma = {
      category: {
        findMany: vi.fn(async () => [{ id: 'c1', name: 'Predefined', type: 'predefined' }]),
        findFirst: vi.fn(async () => null),
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({ id: 'c2', ...data })),
        update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      },
      budget: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => ({ id: 'b1', ...data })),
        update: vi.fn(),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
    };

    svc = new CategoriesService(mockPrisma as any);
  });

  it('findAll returns list', async () => {
    const res = await svc.findAll('user-1');
    expect(res).toHaveLength(1);
  });

  it('create throws BadRequestException when duplicate exists', async () => {
    mockPrisma.category.findFirst.mockResolvedValueOnce({ id: 'dup' });
    await expect(svc.create('user-1', { name: 'Test' } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('create succeeds when no duplicate', async () => {
    mockPrisma.category.findFirst.mockResolvedValueOnce(null);
    const res = await svc.create('user-1', { name: 'Test' } as any);
    expect(res).toBeDefined();
  });

  it('update throws NotFound if category not found', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);
    await expect(svc.update('user-1', 'c-xyz', { name: 'New' } as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update predefined throws Forbidden when changing name', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce({
      id: 'c1',
      type: 'predefined',
      name: 'Predefined',
    });
    await expect(svc.update('user-1', 'c1', { name: 'NewName' } as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('update custom throws BadRequest when new name duplicates', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce({
      id: 'c3',
      type: 'custom',
      name: 'Old',
      userId: 'user-1',
    });
    mockPrisma.category.findFirst.mockResolvedValueOnce({ id: 'another' });
    await expect(svc.update('user-1', 'c3', { name: 'Dup' } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('remove throws when not found', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);
    await expect(svc.remove('user-1', 'c-xyz')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove throws Forbidden for predefined', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce({
      id: 'c1',
      type: 'predefined',
      userId: 'system',
    });
    await expect(svc.remove('user-1', 'c1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('remove succeeds when allowed', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce({
      id: 'c2',
      type: 'custom',
      userId: 'user-1',
    });
    await svc.remove('user-1', 'c2');
    expect(mockPrisma.category.update).toHaveBeenCalled();
  });
});
