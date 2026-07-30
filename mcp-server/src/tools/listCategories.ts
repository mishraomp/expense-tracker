import type { McpServer } from "@modelcontextprotocol/server";
import { listCategories } from '../categoryLookup.js';
import { runTool, textResult } from '../toolHelpers.js';
import { z } from "zod";

export function registerListCategories(server: McpServer): void {
  server.registerTool(
    'list_categories',
    {
      title: 'List categories',
      description:
        'List all available expense category names. Use this to disambiguate when a spoken category ' +
        "name might not match exactly (e.g. confirm 'Food' vs 'Fast Food' with the user).",
      inputSchema: z.object({}),
    },
    async () =>
      runTool('list_categories', {}, async () => {
        const categories = await listCategories();
        if (categories.length === 0) {
          return textResult('No categories found.');
        }
        return textResult(categories.map((c) => c.name).join(', '));
      }),
  );
}
