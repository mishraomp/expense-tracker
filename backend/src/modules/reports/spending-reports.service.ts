import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  SpendingOverTimeQueryDto,
  SpendingOverTimeResponseDto,
} from './dto/spending-over-time.dto';
import {
  SpendingByCategoryQueryDto,
  CategoryBreakdownItemDto,
} from './dto/spending-by-category.dto';
import {
  SpendingByCategoryTagsQueryDto,
  SpendingByCategoryTagsResponseDto,
} from './dto/spending-by-category-tags.dto';

/**
 * Response DTO for top expense items report
 */
export interface TopExpenseItemDto {
  name: string;
  totalAmount: string;
  itemCount: number;
  expenseCount: number;
  categoryId: string | null;
  categoryName: string | null;
  colorCode: string | null;
}

/**
 * Response DTO for item search results
 */
export interface ItemSearchResultDto {
  id: string;
  name: string;
  amount: string;
  expenseId: string;
  expenseDate: string;
  expenseDescription: string | null;
  categoryId: string | null;
  categoryName: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  notes: string | null;
}

@Injectable()
export class SpendingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSpendingOverTime(
    userId: string,
    q: SpendingOverTimeQueryDto,
  ): Promise<SpendingOverTimeResponseDto> {
    const { startDate, endDate, interval, categoryId, subcategoryId } = q;

    // Build optional filters
    const filters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
    ];
    if (categoryId) filters.push(Prisma.sql`e."category_id" = ${categoryId}::uuid`);
    if (subcategoryId) filters.push(Prisma.sql`e."subcategory_id" = ${subcategoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')} AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date`;

    const bucketExpr =
      interval === 'day'
        ? Prisma.sql`e."date"`
        : interval === 'week'
          ? Prisma.sql`DATE_TRUNC('week', e."date"::timestamp)::date`
          : Prisma.sql`DATE_TRUNC('month', e."date"::timestamp)::date`;

    const rows: Array<{ bucket: Date; amount: string }> = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT ${bucketExpr} as bucket, COALESCE(SUM(e."amount"), 0)::text as amount
        FROM "expenses" e
        ${where}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
    );

    return {
      data: rows.map((r) => ({ bucket: r.bucket.toISOString().slice(0, 10), amount: r.amount })),
      meta: { interval },
    };
  }

  async getSpendingByCategory(
    userId: string,
    q: SpendingByCategoryQueryDto,
  ): Promise<CategoryBreakdownItemDto[]> {
    const { startDate, endDate, categoryId, subcategoryId } = q;

    const filters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
    ];
    if (categoryId) filters.push(Prisma.sql`e."category_id" = ${categoryId}::uuid`);
    if (subcategoryId) filters.push(Prisma.sql`e."subcategory_id" = ${subcategoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')} AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date`;

    const rows: Array<{ id: string; name: string; color_code: string | null; amount: string }> =
      await this.prisma.$queryRaw(
        Prisma.sql`
        SELECT c."id", c."name", c."color_code", COALESCE(SUM(e."amount"),0)::text as amount
        FROM "expenses" e
        JOIN "categories" c ON c."id" = e."category_id"
        ${where}
        GROUP BY c."id", c."name", c."color_code"
        ORDER BY COALESCE(SUM(e."amount"),0) DESC
      `,
      );

    return rows.map((r) => ({
      categoryId: r.id,
      categoryName: r.name,
      colorCode: r.color_code,
      amount: r.amount,
    }));
  }

  async getSpendingByCategoryTags(
    userId: string,
    q: SpendingByCategoryTagsQueryDto,
  ): Promise<SpendingByCategoryTagsResponseDto> {
    const { startDate, endDate, categoryId, tagIds } = q;

    if (!categoryId && (!tagIds || tagIds.length === 0)) {
      throw new BadRequestException('Either categoryId or tagIds must be provided');
    }

    const baseFilters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
      Prisma.sql`e."date" BETWEEN ${startDate}::date AND ${endDate}::date`,
    ];

    const matchFilters: Prisma.Sql[] = [];

    if (categoryId) {
      matchFilters.push(
        Prisma.sql`(
          e."category_id" = ${categoryId}::uuid
          OR EXISTS (
            SELECT 1
            FROM "expense_items" ei
            WHERE ei."expense_id" = e."id"
              AND ei."deleted_at" IS NULL
              AND COALESCE(ei."category_id", e."category_id") = ${categoryId}::uuid
          )
        )`,
      );
    }

    if (tagIds && tagIds.length > 0) {
      const tagIdArraySql = Prisma.sql`ARRAY[${Prisma.join(tagIds.map((id) => Prisma.sql`${id}::uuid`))}]`;
      matchFilters.push(
        Prisma.sql`(
          EXISTS (
            SELECT 1
            FROM "expense_tags" et
            JOIN "tags" t ON t."id" = et."tag_id" AND t."user_id" = ${userId}::uuid
            WHERE et."expense_id" = e."id"
              AND et."tag_id" = ANY(${tagIdArraySql})
          )
          OR EXISTS (
            SELECT 1
            FROM "expense_items" ei
            JOIN "expense_item_tags" eit ON eit."expense_item_id" = ei."id"
            JOIN "tags" t ON t."id" = eit."tag_id" AND t."user_id" = ${userId}::uuid
            WHERE ei."expense_id" = e."id"
              AND ei."deleted_at" IS NULL
              AND eit."tag_id" = ANY(${tagIdArraySql})
          )
        )`,
      );
    }

    const where = Prisma.sql`
      WHERE ${Prisma.join(baseFilters, ' AND ')}
        AND (${Prisma.join(matchFilters, ' OR ')})
    `;

    const rows: Array<{
      id: string;
      user_id: string;
      category_id: string;
      subcategory_id: string | null;
      amount: string;
      date: string;
      description: string | null;
      source: string;
      status: string;
      merchant_name: string | null;
      created_at: Date;
      updated_at: Date;
      cat_id: string;
      cat_name: string;
      cat_type: string;
      cat_color_code: string | null;
      cat_icon: string | null;
      sub_id: string | null;
      sub_name: string | null;
      tags: any;
    }> = await this.prisma.$queryRaw(
      Prisma.sql`
        WITH matched AS (
          SELECT DISTINCT ON (e."id")
            e."id",
            e."date",
            e."created_at"
          FROM "expenses" e
          ${where}
          ORDER BY e."id", e."date" DESC, e."created_at" DESC
        )
        SELECT
          e."id" AS id,
          e."user_id" AS user_id,
          e."category_id" AS category_id,
          e."subcategory_id" AS subcategory_id,
          e."amount"::text AS amount,
          e."date"::text AS date,
          e."description" AS description,
          e."source"::text AS source,
          e."status"::text AS status,
          e."merchant_name" AS merchant_name,
          e."created_at" AS created_at,
          e."updated_at" AS updated_at,
          c."id" AS cat_id,
          c."name" AS cat_name,
          c."type"::text AS cat_type,
          c."color_code" AS cat_color_code,
          c."icon" AS cat_icon,
          sc."id" AS sub_id,
          sc."name" AS sub_name,
          COALESCE(tag_agg.tags, '[]'::jsonb) AS tags
        FROM matched m
        JOIN "expenses" e ON e."id" = m."id"
        JOIN "categories" c ON c."id" = e."category_id"
        LEFT JOIN "subcategories" sc ON sc."id" = e."subcategory_id"
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(DISTINCT jsonb_build_object(
            'id', t."id",
            'name', t."name",
            'colorCode', t."color_code"
          )) AS tags
          FROM (
            SELECT et."tag_id" AS tag_id
            FROM "expense_tags" et
            WHERE et."expense_id" = e."id"
            UNION
            SELECT eit."tag_id" AS tag_id
            FROM "expense_items" ei
            JOIN "expense_item_tags" eit ON eit."expense_item_id" = ei."id"
            WHERE ei."expense_id" = e."id" AND ei."deleted_at" IS NULL
          ) tag_ids
          JOIN "tags" t ON t."id" = tag_ids.tag_id AND t."user_id" = ${userId}::uuid
        ) tag_agg ON TRUE
        ORDER BY e."date" DESC, e."created_at" DESC
      `,
    );

    const data = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      categoryId: r.category_id,
      subcategoryId: r.subcategory_id,
      amount: Number(r.amount),
      date: r.date,
      description: r.description,
      source: r.source,
      status: r.status,
      merchantName: r.merchant_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      category: {
        id: r.cat_id,
        name: r.cat_name,
        type: r.cat_type,
        colorCode: r.cat_color_code,
        icon: r.cat_icon,
      },
      subcategory: r.sub_id && r.sub_name ? { id: r.sub_id, name: r.sub_name } : undefined,
      tags: Array.isArray(r.tags) ? r.tags : [],
    }));

    const totalAmount = data.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      data,
      summary: { totalAmount, count: data.length },
    };
  }

  async getSpendingBySubcategory(
    userId: string,
    q: SpendingByCategoryQueryDto,
  ): Promise<
    Array<{
      subcategoryId: string;
      subcategoryName: string;
      categoryId: string;
      categoryName: string;
      colorCode: string | null;
      amount: string;
    }>
  > {
    const { startDate, endDate, categoryId, subcategoryId } = q;

    // Build base filters for expenses
    const baseExpenseFilters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
    ];

    // Build filters for expense items
    const itemFilters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
      Prisma.sql`ei."deleted_at" IS NULL`,
      Prisma.sql`ei."subcategory_id" IS NOT NULL`,
    ];
    if (categoryId) itemFilters.push(Prisma.sql`ei."category_id" = ${categoryId}::uuid`);
    if (subcategoryId) itemFilters.push(Prisma.sql`ei."subcategory_id" = ${subcategoryId}::uuid`);

    const itemWhere = Prisma.sql`WHERE ${Prisma.join(itemFilters, ' AND ')} AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date`;

    // Union: expense items with subcategory + expenses with subcategory that DON'T have items with that subcategory
    const rows: Array<{
      subcategory_id: string;
      subcategory_name: string;
      category_id: string;
      category_name: string;
      color_code: string | null;
      amount: string;
    }> = await this.prisma.$queryRaw(
      Prisma.sql`
        WITH combined_spending AS (
          -- Expense items assigned to subcategories (preferred when present)
          SELECT ei."subcategory_id", ei."amount"
          FROM "expense_items" ei
          JOIN "expenses" e ON e."id" = ei."expense_id"
          ${itemWhere}

          UNION ALL

          -- Expenses directly assigned to subcategories, but ONLY if they don't have
          -- expense_items with that same subcategory (to avoid double counting)
          SELECT e."subcategory_id", e."amount"
          FROM "expenses" e
          WHERE ${Prisma.join(baseExpenseFilters, ' AND ')}
            AND e."subcategory_id" IS NOT NULL
            ${categoryId ? Prisma.sql`AND e."category_id" = ${categoryId}::uuid` : Prisma.empty}
            ${subcategoryId ? Prisma.sql`AND e."subcategory_id" = ${subcategoryId}::uuid` : Prisma.empty}
            AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date
            AND NOT EXISTS (
              SELECT 1 FROM "expense_items" ei
              WHERE ei."expense_id" = e."id"
                AND ei."deleted_at" IS NULL
                AND ei."subcategory_id" = e."subcategory_id"
            )
        )
        SELECT s."id" as subcategory_id, s."name" as subcategory_name,
               c."id" as category_id, c."name" as category_name, c."color_code",
               COALESCE(SUM(cs."amount"),0)::text as amount
        FROM combined_spending cs
        JOIN "subcategories" s ON s."id" = cs."subcategory_id"
        JOIN "categories" c ON c."id" = s."category_id"
        GROUP BY s."id", s."name", c."id", c."name", c."color_code"
        ORDER BY COALESCE(SUM(cs."amount"),0) DESC
      `,
    );

    return rows.map((r) => ({
      subcategoryId: r.subcategory_id,
      subcategoryName: r.subcategory_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      colorCode: r.color_code,
      amount: r.amount,
    }));
  }

  /**
   * Get top expense items aggregated by name.
   * Groups items by name and returns total amount, count, and associated category.
   */
  async getTopExpenseItems(
    userId: string,
    params: {
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      limit?: number;
    },
  ): Promise<TopExpenseItemDto[]> {
    const { startDate, endDate, categoryId, limit = 10 } = params;

    const filters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
      Prisma.sql`ei."deleted_at" IS NULL`,
    ];

    if (startDate) filters.push(Prisma.sql`e."date" >= ${startDate}::date`);
    if (endDate) filters.push(Prisma.sql`e."date" <= ${endDate}::date`);
    if (categoryId)
      filters.push(Prisma.sql`COALESCE(ei."category_id", e."category_id") = ${categoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;

    const rows: Array<{
      name: string;
      total_amount: string;
      item_count: string;
      expense_count: string;
      category_id: string | null;
      category_name: string | null;
      color_code: string | null;
    }> = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT
          LOWER(TRIM(ei."name")) as name,
          COALESCE(SUM(ei."amount"), 0)::text as total_amount,
          COUNT(ei."id")::text as item_count,
          COUNT(DISTINCT ei."expense_id")::text as expense_count,
          MODE() WITHIN GROUP (ORDER BY COALESCE(ei."category_id", e."category_id")) as category_id,
          c."name" as category_name,
          c."color_code" as color_code
        FROM "expense_items" ei
        JOIN "expenses" e ON e."id" = ei."expense_id"
        LEFT JOIN "categories" c ON c."id" = COALESCE(ei."category_id", e."category_id")
        ${where}
        GROUP BY LOWER(TRIM(ei."name")), c."id", c."name", c."color_code"
        ORDER BY COALESCE(SUM(ei."amount"), 0) DESC
        LIMIT ${limit}
      `,
    );

    return rows.map((r) => ({
      name: r.name,
      totalAmount: r.total_amount,
      itemCount: parseInt(r.item_count),
      expenseCount: parseInt(r.expense_count),
      categoryId: r.category_id,
      categoryName: r.category_name,
      colorCode: r.color_code,
    }));
  }

  /**
   * Get expense line items for a specific subcategory within a date range.
   * Returns ONLY expense_items (line items), NOT expenses from the main table.
   */
  async getSubcategoryLineItems(
    userId: string,
    params: {
      subcategoryId: string;
      startDate: string;
      endDate: string;
    },
  ): Promise<{
    items: Array<{
      id: string;
      name: string;
      amount: string;
      expenseId: string;
      expenseDate: string;
      expenseDescription: string | null;
      source: 'item';
    }>;
    total: string;
  }> {
    const { subcategoryId, startDate, endDate } = params;

    // Get ONLY expense items with this subcategory (not expenses from main table)
    const itemRows: Array<{
      id: string;
      name: string;
      amount: string;
      expense_id: string;
      expense_date: Date;
      expense_description: string | null;
    }> = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT
          ei."id",
          ei."name",
          ei."amount"::text as amount,
          ei."expense_id",
          e."date" as expense_date,
          e."description" as expense_description
        FROM "expense_items" ei
        JOIN "expenses" e ON e."id" = ei."expense_id"
        WHERE e."user_id" = ${userId}::uuid
          AND e."deleted_at" IS NULL
          AND ei."deleted_at" IS NULL
          AND ei."subcategory_id" = ${subcategoryId}::uuid
          AND e."date" BETWEEN ${startDate}::date AND ${endDate}::date
        ORDER BY e."date" DESC, ei."created_at" DESC
      `,
    );

    // Format results - only line items
    const items = itemRows.map((r) => ({
      id: r.id,
      name: r.name,
      amount: r.amount,
      expenseId: r.expense_id,
      expenseDate: r.expense_date.toISOString().split('T')[0],
      expenseDescription: r.expense_description,
      source: 'item' as const,
    }));

    // Calculate total
    const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2);

    return { items, total };
  }

  /**
   * Search expense items by name.
   * Supports partial matching with pagination.
   */
  async searchExpenseItems(
    userId: string,
    params: {
      query: string;
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ data: ItemSearchResultDto[]; total: number }> {
    const { query, startDate, endDate, categoryId, page = 1, pageSize = 20 } = params;
    const offset = (page - 1) * pageSize;

    // Sanitize and create search pattern
    const searchPattern = `%${query.toLowerCase().trim()}%`;

    const filters: Prisma.Sql[] = [
      Prisma.sql`e."user_id" = ${userId}::uuid`,
      Prisma.sql`e."deleted_at" IS NULL`,
      Prisma.sql`ei."deleted_at" IS NULL`,
      Prisma.sql`LOWER(ei."name") LIKE ${searchPattern}`,
    ];

    if (startDate) filters.push(Prisma.sql`e."date" >= ${startDate}::date`);
    if (endDate) filters.push(Prisma.sql`e."date" <= ${endDate}::date`);
    if (categoryId)
      filters.push(Prisma.sql`COALESCE(ei."category_id", e."category_id") = ${categoryId}::uuid`);

    const where = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;

    // Get total count
    const countResult = await this.prisma.$queryRaw<{ count: string }[]>(
      Prisma.sql`
        SELECT COUNT(*)::text as count
        FROM "expense_items" ei
        JOIN "expenses" e ON e."id" = ei."expense_id"
        ${where}
      `,
    );
    const total = parseInt(countResult[0]?.count || '0');

    // Get paginated results
    const rows: Array<{
      id: string;
      name: string;
      amount: string;
      expense_id: string;
      expense_date: Date;
      expense_description: string | null;
      category_id: string | null;
      category_name: string | null;
      subcategory_id: string | null;
      subcategory_name: string | null;
      notes: string | null;
    }> = await this.prisma.$queryRaw(
      Prisma.sql`
        SELECT
          ei."id",
          ei."name",
          ei."amount"::text as amount,
          ei."expense_id",
          e."date" as expense_date,
          e."description" as expense_description,
          COALESCE(ei."category_id", e."category_id") as category_id,
          c."name" as category_name,
          COALESCE(ei."subcategory_id", e."subcategory_id") as subcategory_id,
          s."name" as subcategory_name,
          ei."notes"
        FROM "expense_items" ei
        JOIN "expenses" e ON e."id" = ei."expense_id"
        LEFT JOIN "categories" c ON c."id" = COALESCE(ei."category_id", e."category_id")
        LEFT JOIN "subcategories" s ON s."id" = COALESCE(ei."subcategory_id", e."subcategory_id")
        ${where}
        ORDER BY e."date" DESC, ei."created_at" DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `,
    );

    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        amount: r.amount,
        expenseId: r.expense_id,
        expenseDate: r.expense_date.toISOString().split('T')[0],
        expenseDescription: r.expense_description,
        categoryId: r.category_id,
        categoryName: r.category_name,
        subcategoryId: r.subcategory_id,
        subcategoryName: r.subcategory_name,
        notes: r.notes,
      })),
      total,
    };
  }
}
