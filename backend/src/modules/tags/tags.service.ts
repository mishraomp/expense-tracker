import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from './dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all tags for a user
   */
  async findAll(userId: string): Promise<TagResponseDto[]> {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    return tags.map(this.toResponseDto);
  }

  /**
   * Get a single tag by ID (must belong to user)
   */
  async findOne(userId: string, tagId: string): Promise<TagResponseDto> {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, userId },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }

    return this.toResponseDto(tag);
  }

  /**
   * Create a new tag
   */
  async create(userId: string, dto: CreateTagDto): Promise<TagResponseDto> {
    // Check for duplicate name
    const existing = await this.prisma.tag.findFirst({
      where: {
        userId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Tag "${dto.name}" already exists`);
    }

    const tag = await this.prisma.tag.create({
      data: {
        userId,
        name: dto.name.trim(),
        colorCode: dto.colorCode || null,
      },
    });

    return this.toResponseDto(tag);
  }

  /**
   * Update an existing tag
   */
  async update(
    userId: string,
    tagId: string,
    dto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    // Verify ownership
    const existing = await this.prisma.tag.findFirst({
      where: { id: tagId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.prisma.tag.findFirst({
        where: {
          userId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: tagId },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Tag "${dto.name}" already exists`);
      }
    }

    const tag = await this.prisma.tag.update({
      where: { id: tagId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.colorCode !== undefined && { colorCode: dto.colorCode }),
      },
    });

    return this.toResponseDto(tag);
  }

  /**
   * Delete a tag (cascade removes all associations)
   */
  async delete(userId: string, tagId: string): Promise<void> {
    // Verify ownership
    const existing = await this.prisma.tag.findFirst({
      where: { id: tagId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }

    await this.prisma.tag.delete({
      where: { id: tagId },
    });
  }

  /**
   * Find or create a tag by name (for inline creation)
   */
  async findOrCreate(
    userId: string,
    name: string,
    colorCode?: string,
  ): Promise<TagResponseDto> {
    const existing = await this.prisma.tag.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existing) {
      return this.toResponseDto(existing);
    }

    return this.create(userId, { name, colorCode });
  }

  /**
   * Get tags by IDs (for expense association)
   */
  async findByIds(userId: string, tagIds: string[]): Promise<TagResponseDto[]> {
    const tags = await this.prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        userId,
      },
    });

    return tags.map(this.toResponseDto);
  }

  private toResponseDto(tag: {
    id: string;
    name: string;
    colorCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): TagResponseDto {
    return {
      id: tag.id,
      name: tag.name,
      colorCode: tag.colorCode,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }
}
