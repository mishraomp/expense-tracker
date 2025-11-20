import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
        OR: [{ type: 'predefined' }, { type: 'custom', userId }],
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(
    userId: string,
    data: {
      name: string;
      colorCode?: string;
      icon?: string;
      budgetAmount?: string | number;
      budgetPeriod?: 'monthly' | 'annual';
    },
  ) {
    // Prevent duplicates (case-insensitive) per user among custom categories
    const existing = await this.prisma.category.findFirst({
      where: {
        deletedAt: null,
        type: 'custom',
        userId,
        name: { equals: data.name, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Category name already exists');
    }

    return this.prisma.category.create({
      data: {
        type: 'custom',
        userId,
        name: data.name,
        colorCode: data.colorCode,
        icon: data.icon,
        budgetAmount:
          data.budgetAmount !== undefined
            ? new Prisma.Decimal(data.budgetAmount as any)
            : undefined,
        budgetPeriod: data.budgetPeriod,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: {
      name?: string;
      colorCode?: string;
      icon?: string;
      budgetAmount?: string | number | null;
      budgetPeriod?: 'monthly' | 'annual' | null;
    },
  ) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found');
    }
    if (category.type === 'predefined') {
      // Allow limited edits for predefined categories: color and budget only
      if (data.name && data.name !== category.name) {
        throw new ForbiddenException('Cannot change name of predefined category');
      }
      if (data.icon && data.icon !== category.icon) {
        throw new ForbiddenException('Cannot change icon of predefined category');
      }

      return this.prisma.category.update({
        where: { id },
        data: {
          // name and icon remain unchanged
          colorCode: data.colorCode ?? category.colorCode,
          budgetAmount:
            data.budgetAmount === null
              ? null
              : data.budgetAmount !== undefined
                ? new Prisma.Decimal(data.budgetAmount as any)
                : undefined,
          budgetPeriod: data.budgetPeriod === null ? null : (data.budgetPeriod ?? undefined),
        },
      });
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('Not allowed to modify this category');
    }

    // If name is changing, enforce uniqueness (case-insensitive)
    if (data.name && data.name !== category.name) {
      const dup = await this.prisma.category.findFirst({
        where: {
          deletedAt: null,
          type: 'custom',
          userId,
          name: { equals: data.name, mode: 'insensitive' },
          NOT: { id },
        },
        select: { id: true },
      });
      if (dup) {
        throw new BadRequestException('Category name already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: data.name ?? category.name,
        colorCode: data.colorCode ?? category.colorCode,
        icon: data.icon ?? category.icon,
        budgetAmount:
          data.budgetAmount === null
            ? null
            : data.budgetAmount !== undefined
              ? new Prisma.Decimal(data.budgetAmount as any)
              : undefined,
        budgetPeriod: data.budgetPeriod === null ? null : (data.budgetPeriod ?? undefined),
      },
    });
  }

  async remove(userId: string, id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found');
    }
    if (category.type === 'predefined') {
      throw new ForbiddenException('Cannot delete predefined category');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('Not allowed to delete this category');
    }

    await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
