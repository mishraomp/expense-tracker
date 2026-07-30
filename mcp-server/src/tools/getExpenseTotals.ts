import { z } from 'zod';
import type { McpServer } from "@modelcontextprotocol/server";
import { apiRequest } from '../apiClient.js';
import { resolveCategoryId } from '../categoryLookup.js';
import { runTool, textResult, formatMoney } from '../toolHelpers.js';

interface Totals {
  total: number;
  count: number;
  budgetAmount?: number;
  budgetPeriod?: string;
  budgetSource?: string;
}

export function registerGetExpenseTotals(server: McpServer): void {
  server.registerTool(
    'get_expense_totals',
    {
      title: 'Get expense totals',
      description:
        "Get the total spent (and count) for a period and/or category, e.g. \"how much have I spent " +
        'on Food this month?" Also reports the budget amount for that category/period if one is set.',
      inputSchema: z.object({
              categoryName: z.string().optional(),
              startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
              endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
              filterYear: z.number().int().min(1900).max(2100).optional(),
              filterMonth: z.number().int().min(1).max(12).optional(),
            }),
    },
    async ({ categoryName, startDate, endDate, filterYear, filterMonth }) =>
      runTool('get_expense_totals', { categoryName, startDate, endDate, filterYear, filterMonth }, async () => {
        const categoryId = categoryName ? await resolveCategoryId(categoryName) : undefined;

        const totals = await apiRequest<Totals>('/expenses/totals', {
          query: {
            categoryId,
            startDate,
            endDate,
            filterYear: filterYear?.toString(),
            filterMonth: filterMonth?.toString(),
          },
        });

        const scope = categoryName ? ` on ${categoryName}` : '';
        let text = `Spent ${formatMoney(totals.total)} across ${totals.count} expense(s)${scope}.`;
        if (totals.budgetAmount !== undefined) {
          text += ` Budget: ${formatMoney(totals.budgetAmount)} (${totals.budgetPeriod}).`;
        }
        return textResult(text);
      }),
  );
}
