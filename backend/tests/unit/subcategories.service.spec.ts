import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubcategoriesService } from '../../src/modules/subcategories/subcategories.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('SubcategoriesService', () => {
  let mockPrisma: any;
  let svc: SubcategoriesService;

  beforeEach(() => {
    mockPrisma = {
      prisma: true,
      category: { findUnique: vi.fn() },
      subcategory: {
        create: vi.fn(),
        findMany: vi.fn(async () => []),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      expense: { count: vi.fn(async () => 5) },
    };
    svc = new SubcategoriesService(mockPrisma as any);
  });

  it('create throws BadRequest when category missing', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);
    await expect(svc.create({ name: 'Test', categoryId: 'cat-1' } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('create succeeds', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-1' });
    mockPrisma.subcategory.create.mockResolvedValueOnce({ id: 'sub-1' });
    const res = await svc.create({ name: 'Test', categoryId: 'cat-1' } as any);
    expect(res).toBeDefined();
  });

  it('update throws when target category missing', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);
    mockPrisma.subcategory.update.mockResolvedValueOnce({ id: 'sub-1' });
    await expect(svc.update('sub-1', { categoryId: 'cat-unknown' } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('findOneWithCategory returns subcategory with category', async () => {
    mockPrisma.subcategory.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      category: { id: 'c1', name: 'Cat' },
    });
    const res = await svc.findOneWithCategory('sub-1');
    expect((res as any).category).toBeDefined();
  });

  it('findOne throws not found', async () => {
    mockPrisma.subcategory.findUnique.mockResolvedValueOnce(null);
    await expect(svc.findOne('sub-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findOne returns subcategory', async () => {
    mockPrisma.subcategory.findUnique.mockResolvedValueOnce({ id: 'sub-1' });
    const res = await svc.findOne('sub-1');
    expect(res).toBeDefined();
  });

  it('update throws Conflict when Primsas constraint P2002 is raised', async () => {
    mockPrisma.subcategory.findUnique.mockResolvedValueOnce({ id: 'sub-1' });
    mockPrisma.subcategory.update.mockRejectedValueOnce({ code: 'P2002' });
    await expect(svc.update('sub-1', { name: 'Test' } as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('remove returns affected expenses count', async () => {
    mockPrisma.expense.count.mockResolvedValueOnce(3);
    mockPrisma.subcategory.delete.mockResolvedValueOnce({ id: 'sub-1' });
    const res = await svc.remove('sub-1');
    expect(res.affectedExpenses).toBe(3);
  });
});
