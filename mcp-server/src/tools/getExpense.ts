import { z } from 'zod';
import type { McpServer } from "@modelcontextprotocol/server";
import { apiRequest } from '../apiClient.js';
import { runTool, textResult, formatMoney } from '../toolHelpers.js';

interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  category?: { name: string };
  subcategory?: { name: string };
  totalWithTax: number;
}

export function registerGetExpense(server: McpServer): void {
  server.registerTool(
    'get_expense',
    {
      title: 'Get expense details',
      description: 'Get full details for one expense by id.',
      inputSchema: z.object({
              id: z.string().uuid(),
            }),
    },
    async ({ id }) =>
      runTool('get_expense', { id }, async () => {
        const expense = await apiRequest<Expense>(`/expenses/${id}`);
        const cat = expense.category?.name ?? 'Uncategorized';
        const sub = expense.subcategory?.name ? ` / ${expense.subcategory.name}` : '';
        const desc = expense.description ? `\nDescription: ${expense.description}` : '';
        return textResult(
          `${formatMoney(expense.amount)} (total with tax: ${formatMoney(expense.totalWithTax)}) ` +
            `on ${expense.date} — ${cat}${sub}${desc}\nId: ${expense.id}`,
        );
      }),
  );
}
