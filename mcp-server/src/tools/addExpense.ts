import { z } from 'zod';
import type { McpServer } from "@modelcontextprotocol/server";
import { apiRequest } from '../apiClient.js';
import { runTool, textResult, todayLocalDate, formatMoney } from '../toolHelpers.js';

interface BulkCreateResult {
  created: Array<{ id: string; amount: number }>;
  duplicates: Array<{ index: number; reason: string }>;
  failed: Array<{ index: number; error: string }>;
  summary: { total: number; created: number; duplicates: number; failed: number };
}

export function registerAddExpense(server: McpServer): void {
  server.registerTool(
    'add_expense',
    {
      title: 'Add expense',
      description:
        'Add a new expense by category name (e.g. "Food") — no need to look up category IDs first. ' +
        'Date defaults to today if not given.',
      inputSchema: z.object({
              amount: z.number().positive().describe('Expense amount, e.g. 12.50'),
              categoryName: z.string().min(1).describe("Category name, e.g. 'Food'"),
              subcategoryName: z.string().min(1).optional().describe('Optional subcategory name'),
              date: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
                .optional()
                .describe('Date as YYYY-MM-DD. Defaults to today if omitted.'),
              description: z.string().max(500).optional().describe('Optional free-text note'),
            }),
    },
    async ({ amount, categoryName, subcategoryName, date, description }) =>
      runTool('add_expense', { amount, categoryName, subcategoryName, date, description }, async () => {
        const effectiveDate = date ?? todayLocalDate();
        const result = await apiRequest<BulkCreateResult>('/expenses/bulk', {
          method: 'POST',
          body: {
            expenses: [
              {
                amount,
                categoryName,
                subcategoryName,
                date: effectiveDate,
                description,
                source: 'api',
              },
            ],
          },
        });

        if (result.summary.created === 1) {
          const created = result.created[0];
          return textResult(
            `Added ${formatMoney(amount)} to ${categoryName}` +
              `${subcategoryName ? ` / ${subcategoryName}` : ''} on ${effectiveDate}. ` +
              `Expense id: ${created?.id}`,
          );
        }

        if (result.summary.duplicates > 0) {
          return textResult(
            `Not added — this looks like a duplicate of an existing expense: ${result.duplicates[0]?.reason}`,
          );
        }

        return textResult(`Could not add the expense: ${result.failed[0]?.error ?? 'unknown error'}`);
      }),
  );
}
