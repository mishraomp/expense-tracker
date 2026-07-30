import { z } from 'zod';
import type { McpServer } from "@modelcontextprotocol/server";
import { apiRequest } from '../apiClient.js';
import { resolveCategoryId, resolveSubcategoryId } from '../categoryLookup.js';
import { runTool, textResult, formatMoney } from '../toolHelpers.js';

interface Expense {
  id: string;
  date: string;
  amount: number;
  category?: { name: string };
  subcategory?: { name: string };
}

export function registerUpdateExpense(server: McpServer): void {
  server.registerTool(
    'update_expense',
    {
      title: 'Update an expense',
      description:
        'Update one or more fields of an existing expense by id. Only the fields you provide are changed. ' +
        'Use list_expenses first to find the id.',
      inputSchema: z.object({
              id: z.string().uuid(),
              amount: z.number().positive().optional(),
              categoryName: z.string().min(1).optional(),
              subcategoryName: z.string().min(1).optional(),
              date: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
                .optional(),
              description: z.string().max(500).optional(),
            }),
    },
    async ({ id, amount, categoryName, subcategoryName, date, description }) =>
      runTool('update_expense', { id, amount, categoryName, subcategoryName, date, description }, async () => {
        const categoryId = categoryName ? await resolveCategoryId(categoryName) : undefined;
        const subcategoryId =
          subcategoryName && categoryId
            ? await resolveSubcategoryId(categoryId, subcategoryName)
            : undefined;

        const updated = await apiRequest<Expense>(`/expenses/${id}`, {
          method: 'PUT',
          body: { amount, categoryId, subcategoryId, date, description },
        });

        const cat = updated.category?.name ?? 'Uncategorized';
        const sub = updated.subcategory?.name ? ` / ${updated.subcategory.name}` : '';
        return textResult(`Updated. Now: ${formatMoney(updated.amount)} on ${updated.date} — ${cat}${sub}`);
      }),
  );
}
