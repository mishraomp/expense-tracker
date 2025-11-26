import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagsService } from '../../src/modules/tags/tags.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TagsService', () => {
  let mockPrisma: any;
  let service: TagsService;

  const mockTag = {
    id: 'tag-1',
    userId: 'user-1',
    name: 'Hardware',
    colorCode: '#FF5733',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(() => {
    mockPrisma = {
      tag: {
        findMany: vi.fn(async () => [mockTag]),
        findFirst: vi.fn(async () => null),
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({
          id: 'tag-new',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        })),
        update: vi.fn(async ({ where, data }: any) => ({
          ...mockTag,
          ...data,
          id: where.id,
        })),
        delete: vi.fn(async () => mockTag),
      },
    };

    service = new TagsService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('returns all tags for user ordered by name', async () => {
      const result = await service.findAll('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Hardware');
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { name: 'asc' },
      });
    });

    it('returns empty array when no tags exist', async () => {
      mockPrisma.tag.findMany.mockResolvedValueOnce([]);
      const result = await service.findAll('user-1');
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('returns tag when found', async () => {
      mockPrisma.tag.findFirst.mockResolvedValueOnce(mockTag);
      const result = await service.findOne('user-1', 'tag-1');
      expect(result.id).toBe('tag-1');
      expect(result.name).toBe('Hardware');
    });

    it('throws NotFoundException when tag not found', async () => {
      mockPrisma.tag.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne('user-1', 'nonexistent')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates tag successfully', async () => {
      const dto = { name: 'Groceries', colorCode: '#00FF00' };
      const result = await service.create('user-1', dto);
      expect(result.name).toBe('Groceries');
      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Groceries',
          colorCode: '#00FF00',
        },
      });
    });

    it('creates tag without color code', async () => {
      const dto = { name: 'NoColor' };
      const result = await service.create('user-1', dto);
      expect(result.name).toBe('NoColor');
      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'NoColor',
          colorCode: null,
        },
      });
    });

    it('trims tag name whitespace', async () => {
      const dto = { name: '  Trimmed  ' };
      await service.create('user-1', dto);
      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Trimmed',
          colorCode: null,
        },
      });
    });

    it('throws ConflictException when duplicate name exists', async () => {
      mockPrisma.tag.findFirst.mockResolvedValueOnce(mockTag);
      await expect(service.create('user-1', { name: 'Hardware' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('updates tag name successfully', async () => {
      mockPrisma.tag.findFirst.mockResolvedValueOnce(mockTag);
      const result = await service.update('user-1', 'tag-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('updates tag color code successfully', async () => {
      mockPrisma.tag.findFirst.mockResolvedValueOnce(mockTag);
      const result = await service.update('user-1', 'tag-1', { colorCode: '#0000FF' });
      expect(result.colorCode).toBe('#0000FF');
    });

    it('throws NotFoundException when tag not found', async () => {
      mockPrisma.tag.findFirst.mockResolvedValueOnce(null);
      await expect(service.update('user-1', 'nonexistent', { name: 'New' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ConflictException when new name duplicates another tag', async () => {
      mockPrisma.tag.findFirst
        .mockResolvedValueOnce(mockTag) // First call: find existing tag
        .mockResolvedValueOnce({ id: 'tag-2', name: 'Existing' }); // Second call: check duplicate
      await expect(service.update('user-1', 'tag-1', { name: 'Existing' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('allows updating with same name (case-insensitive check)', async () => {
      mockPrisma.tag.findFirst
        .mockResolvedValueOnce(mockTag) // First call: find existing tag
        .mockResolvedValueOnce(null); // Second call: no duplicate
      const result = await service.update('user-1', 'tag-1', { name: 'HARDWARE' });
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('deletes tag successfully', async () => {
      mockPrisma.tag.findFirst.mockResolvedValueOnce(mockTag);
      await service.delete('user-1', 'tag-1');
      expect(mockPrisma.tag.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      });
    });

    it('throws NotFoundException when tag not found', async () => {
      mockPrisma.tag.findFirst.mockResolvedValueOnce(null);
      await expect(service.delete('user-1', 'nonexistent')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findOrCreate', () => {
    it('returns existing tag when found', async () => {
      mockPrisma.tag.findFirst.mockResolvedValueOnce(mockTag);
      const result = await service.findOrCreate('user-1', 'Hardware');
      expect(result.id).toBe('tag-1');
      expect(mockPrisma.tag.create).not.toHaveBeenCalled();
    });

    it('creates new tag when not found', async () => {
      mockPrisma.tag.findFirst
        .mockResolvedValueOnce(null) // First call in findOrCreate
        .mockResolvedValueOnce(null); // Second call in create (duplicate check)
      const result = await service.findOrCreate('user-1', 'NewTag', '#FF0000');
      expect(result.name).toBe('NewTag');
      expect(mockPrisma.tag.create).toHaveBeenCalled();
    });
  });

  describe('findByIds', () => {
    it('returns tags matching IDs', async () => {
      mockPrisma.tag.findMany.mockResolvedValueOnce([mockTag]);
      const result = await service.findByIds('user-1', ['tag-1']);
      expect(result).toHaveLength(1);
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['tag-1'] },
          userId: 'user-1',
        },
      });
    });

    it('returns empty array when no matching IDs', async () => {
      mockPrisma.tag.findMany.mockResolvedValueOnce([]);
      const result = await service.findByIds('user-1', ['nonexistent']);
      expect(result).toHaveLength(0);
    });
  });
});
