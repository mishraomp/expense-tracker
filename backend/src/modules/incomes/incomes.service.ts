import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomeListQueryDto } from './dto/income-list-query.dto';
import { IncomeResponseDto } from './dto/income-response.dto';
import { AttachmentsService } from '../attachments/attachments.service';

@Injectable()
export class IncomesService {
  constructor(
    private prisma: PrismaService,
    private attachmentsService: AttachmentsService,
  ) {}

  async create(userId: string, dto: CreateIncomeDto): Promise<IncomeResponseDto> {
    const income = await this.prisma.income.create({
      data: {
        userId,
        amount: dto.amount,
        date: new Date(dto.date),
        source: dto.source,
        frequency: dto.frequency,
        description: dto.description,
        employer: dto.employer,
        isRecurring: dto.isRecurring ?? false,
      },
    });

    // If this income is recurring, pre-populate future occurrences for the next 12 months
    // Note: This is a simple approach that inserts actual income records for the next year.
    // For repeat scheduling in production, a generator or scheduler is recommended.
    if (dto.isRecurring) {
      const start = new Date(dto.date);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1); // default: create occurrences for 1 year

      const occurrences = [] as Array<any>;

      // helper to increment date by frequency (returns a new Date)
      const nextDate = (d: Date, frequency: string) => {
        const r = new Date(d);
        switch (frequency) {
          case 'weekly':
            r.setDate(r.getDate() + 7);
            break;
          case 'biweekly':
            r.setDate(r.getDate() + 14);
            break;
          case 'monthly':
            r.setMonth(r.getMonth() + 1);
            break;
          case 'quarterly':
            r.setMonth(r.getMonth() + 3);
            break;
          case 'annual':
            r.setFullYear(r.getFullYear() + 1);
            break;
          default:
            // one_time or unknown -> no recurrence
            r.setFullYear(end.getFullYear() + 100); // push past end
            break;
        }
        return r;
      };

      // If a concrete number of recurrences was provided, generate N occurrences
      // (numberOfRecurrences counts how many future *additional* payments to create)
      const freq = dto.frequency ?? 'one_time';
      if (dto.numberOfRecurrences && dto.numberOfRecurrences > 0) {
        let cursor = new Date(start);
        for (let i = 0; i < dto.numberOfRecurrences; i++) {
          cursor = nextDate(cursor, freq);
          occurrences.push({
            userId,
            amount: dto.amount,
            date: new Date(cursor.toISOString().slice(0, 10)), // date-only as Date
            source: dto.source,
            frequency: dto.frequency,
            description: dto.description,
            employer: dto.employer,
            isRecurring: true,
          });
        }
      } else {
        // No explicit recurrence count given: roll forward until the year boundary
        let cursor = nextDate(start, freq);
        while (cursor <= end) {
          // create a new income only if it does not match the original date
          occurrences.push({
            userId,
            amount: dto.amount,
            date: new Date(cursor.toISOString().slice(0, 10)), // date-only as Date
            source: dto.source,
            frequency: dto.frequency,
            description: dto.description,
            employer: dto.employer,
            isRecurring: true,
          });

          cursor = nextDate(cursor, freq);
        }

        // close the 'else' branch for numberOfRecurrences
      }

      if (occurrences.length > 0) {
        // Use createMany to insert occurrences in one batch
        await this.prisma.income.createMany({
          data: occurrences,
          skipDuplicates: true,
        });
      }
    }

    return IncomeResponseDto.fromPrisma(income);
  }

  async findAll(userId: string, query: IncomeListQueryDto): Promise<IncomeResponseDto[]> {
    const where: any = {
      userId,
      deletedAt: null,
    };

    if (query.month !== undefined && query.year === undefined) {
      throw new BadRequestException('month requires year');
    }

    if (query.year !== undefined) {
      const year = query.year;
      const month = query.month;

      const start =
        month !== undefined
          ? new Date(Date.UTC(year, month - 1, 1))
          : new Date(Date.UTC(year, 0, 1));
      const endExclusive =
        month !== undefined
          ? new Date(Date.UTC(year, month, 1))
          : new Date(Date.UTC(year + 1, 0, 1));

      where.date = { ...where.date, gte: start, lt: endExclusive };
    }

    if (query.startDate) {
      where.date = { ...where.date, gte: new Date(query.startDate) };
    }

    if (query.endDate) {
      where.date = { ...where.date, lte: new Date(query.endDate) };
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.frequency) {
      where.frequency = query.frequency;
    }

    if (query.employer) {
      where.employer = { contains: query.employer, mode: 'insensitive' };
    }

    const incomes = await this.prisma.income.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Attachment counts (ACTIVE only) for these incomes
    const incomeIds = incomes.map((i) => i.id);
    const counts: Record<string, number> = {};
    if (incomeIds.length) {
      const rows = await this.prisma.attachments.findMany({
        where: { linked_income_id: { in: incomeIds }, status: 'ACTIVE' },
        select: { linked_income_id: true },
      });
      for (const row of rows) {
        if (row.linked_income_id) {
          counts[row.linked_income_id] = (counts[row.linked_income_id] || 0) + 1;
        }
      }
    }

    return incomes.map((income) => IncomeResponseDto.fromPrisma(income, counts[income.id] || 0));
  }

  async findOne(userId: string, id: string): Promise<IncomeResponseDto> {
    const income = await this.prisma.income.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!income) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    // Attachment count
    const activeCount = await this.prisma.attachments.count({
      where: { linked_income_id: id, status: 'ACTIVE' },
    });

    const response = IncomeResponseDto.fromPrisma(income, activeCount);

    // Include attachments in detail response list (camelCase from service)
    const attachments = await this.attachmentsService.listAttachments('income', id);
    (response as any).attachments = attachments;

    return response;
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto): Promise<IncomeResponseDto> {
    const existing = await this.prisma.income.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    const income = await this.prisma.income.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.source && { source: dto.source }),
        ...(dto.frequency && { frequency: dto.frequency }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.employer !== undefined && { employer: dto.employer }),
        ...(dto.isRecurring !== undefined && { isRecurring: dto.isRecurring }),
      },
    });

    return IncomeResponseDto.fromPrisma(income);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.income.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    await this.prisma.income.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
