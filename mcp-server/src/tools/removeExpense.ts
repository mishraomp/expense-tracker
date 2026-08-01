import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { apiRequest } from "../apiClient.js";
import { runTool, textResult } from "../toolHelpers.js";

export function registerRemoveExpense(server: McpServer): void {
  server.registerTool(
    "remove_expense",
    {
      title: "Remove an expense",
      description:
        "Soft-delete an expense by id. Use list_expenses first to find the id.",
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool("remove_expense", { id }, async () => {
        await apiRequest<void>(`/expenses/${id}`, { method: "DELETE" });
        return textResult(`Removed expense ${id}.`);
      }),
  );
}
