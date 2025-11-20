import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubcategoryDto, UpdateSubcategoryDto } from './dto';
import { Subcategory } from './subcategory.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubcategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubcategoryDto): Promise<Subcategory> {
    // Ensure parent category exists
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new BadRequestException('Parent category does not exist');
    }

    try {
      return await this.prisma.subcategory.create({
        data: {
          name: dto.name.trim(),
          categoryId: dto.categoryId,
          budgetAmount:
            dto.budgetAmount !== undefined
              ? new Prisma.Decimal(dto.budgetAmount as any)
              : undefined,
          budgetPeriod: dto.budgetPeriod,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Subcategory name must be unique within the category');
      }
      if (
        typeof e.message === 'string' &&
        e.message.includes('Cannot create more than 50 subcategories')
      ) {
        throw new ConflictException('Cannot create more than 50 subcategories per category');
      }
      throw e;
    }
  }

  async findAll(categoryId?: string): Promise<Subcategory[]> {
    return this.prisma.subcategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Subcategory> {
    const subcategory = await this.prisma.subcategory.findUnique({ where: { id } });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

  async findOneWithCategory(
    id: string,
  ): Promise<Subcategory & { category?: { id: string; name: string } }> {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory as any;
  }

  async update(id: string, dto: UpdateSubcategoryDto): Promise<Subcategory> {
    // If moving to a different category, ensure target exists
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException('Target category does not exist');
    }
    try {
      return await this.prisma.subcategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name?.trim() } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          budgetAmount:
            dto.budgetAmount === null
              ? null
              : dto.budgetAmount !== undefined
                ? new Prisma.Decimal(dto.budgetAmount as any)
                : undefined,
          budgetPeriod: dto.budgetPeriod === null ? null : (dto.budgetPeriod ?? undefined),
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Subcategory name must be unique within the category');
      }
      throw e;
    }
  }

  async remove(id: string): Promise<{ affectedExpenses: number }> {
    // Count affected expenses first
    const affectedExpenses = await this.prisma.expense.count({ where: { subcategoryId: id } });
    await this.prisma.subcategory.delete({ where: { id } });
    return { affectedExpenses };
  }

  async expensesCount(id: string): Promise<{ count: number }> {
    const count = await this.prisma.expense.count({ where: { subcategoryId: id } });
    return { count };
  }
}
