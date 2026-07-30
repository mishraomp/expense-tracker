import { z } from 'zod';
import type { McpServer } from "@modelcontextprotocol/server";
import { apiRequest } from '../apiClient.js';
import { resolveCategoryId } from '../categoryLookup.js';
import { runTool, textResult, formatMoney } from '../toolHelpers.js';

interface ExpenseRow {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  category?: { name: string };
  subcategory?: { name: string };
}

interface ExpenseListResponse {
  data: ExpenseRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { totalAmount: number; count: number };
}

export function registerListExpenses(server: McpServer): void {
  server.registerTool(
    'list_expenses',
    {
      title: 'List / search expenses',
      description:
        'List recent expenses, optionally filtered by category name and/or date range. Use this to find ' +
        "an expense's id before calling update_expense or remove_expense. " +
        "'search' only filters within the fetched page, not the whole history — narrow with dates or " +
        'increase pageSize if you cannot find something.',
      inputSchema: z.object({
              categoryName: z.string().optional(),
              startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
              endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
              search: z.string().optional().describe('Case-insensitive substring match on description'),
              page: z.number().int().min(1).optional(),
              pageSize: z.number().int().min(1).max(100).optional(),
            }),
    },
    async ({ categoryName, startDate, endDate, search, page, pageSize }) =>
      runTool('list_expenses', { categoryName, startDate, endDate, search, page, pageSize }, async () => {
        const categoryId = categoryName ? await resolveCategoryId(categoryName) : undefined;

        const result = await apiRequest<ExpenseListResponse>('/expenses', {
          query: {
            categoryId,
            startDate,
            endDate,
            page: page?.toString(),
            pageSize: pageSize?.toString(),
          },
        });

        let rows = result.data;
        if (search) {
          const needle = search.toLowerCase();
          rows = rows.filter((r) => r.description?.toLowerCase().includes(needle));
        }

        if (rows.length === 0) {
          return textResult('No expenses matched.');
        }

        const lines = rows.map((r) => {
          const cat = r.category?.name ?? 'Uncategorized';
          const sub = r.subcategory?.name ? ` / ${r.subcategory.name}` : '';
          const desc = r.description ? ` — ${r.description}` : '';
          return `- ${r.id} | ${r.date} | ${formatMoney(r.amount)} | ${cat}${sub}${desc}`;
        });

        const summary = `Showing ${rows.length} of ${result.pagination.total} total (page ${result.pagination.page}/${result.pagination.totalPages}).`;
        return textResult(`${summary}\n${lines.join('\n')}`);
      }),
  );
}
