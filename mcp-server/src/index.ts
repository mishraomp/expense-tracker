import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { McpServer } from "@modelcontextprotocol/server";
import { fileURLToPath, pathToFileURL } from "url";
import { join, dirname } from "path";
import { registerAddExpense } from "./tools/addExpense.js";
import { registerListExpenses } from "./tools/listExpenses.js";
import { registerGetExpense } from "./tools/getExpense.js";
import { registerUpdateExpense } from "./tools/updateExpense.js";
import { registerRemoveExpense } from "./tools/removeExpense.js";
import { registerGetExpenseTotals } from "./tools/getExpenseTotals.js";
import { registerListCategories } from "./tools/listCategories.js";
import { registerOpenApiTools } from "./openApiTools.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));

// stdio is the MCP transport's wire format — never write diagnostics to stdout,
// only stderr, or it corrupts the JSON-RPC stream.
try {
  process.loadEnvFile(join(moduleDir, "..", ".env"));
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
    throw err;
  }
  // Expected when running as a Claude Desktop extension — env vars come from
  // manifest.json's user_config instead of a .env file. Only warn if they're
  // genuinely missing (e.g. running via Claude Code without having set one up).
  if (!process.env.MCP_BYPASS_SECRET) {
    console.error(
      "[expense-tracker-mcp] No .env file found and MCP_BYPASS_SECRET is unset. " +
        "Copy mcp-server/.env.example to mcp-server/.env and fill it in.",
    );
  }
}

// Operations intentionally omitted from automatic OpenAPI tool registration.
// Curated counterparts below provide clearer, purpose-built MCP tool contracts.
/* const CURATED_OPERATION_IDS = new Set([
  "ExpensesController_bulkCreate_v1", // add_expense
  "ExpensesController_findAll_v1", // list_expenses
  "ExpensesController_findOne_v1", // get_expense
  "ExpensesController_update_v1", // update_expense
  "ExpensesController_remove_v1", // remove_expense
  "ExpensesController_getTotals_v1", // get_expense_totals
  "CategoriesController_findAll_v1", // list_categories
  // Steps in a stateful browser-redirect OAuth handshake, not meaningfully
  // callable as a single request/response tool.
  "OAuthController_authorize_v1",
  "OAuthController_exchange_v1",
  // Streams a raw ZIP binary via a hand-written response header, not JSON —
  // the generic JSON-parsing tool wrapper can't handle it.
  "ExportController_fullExport_v1",
  // Multipart file uploads — there's no file to attach to an MCP tool call in
  // this architecture, and the OpenAPI spec doesn't reliably flag these as
  // non-JSON (NestJS's FileInterceptor/FilesInterceptor uploads aren't
  // auto-documented), so the generic multipart-detection in openApiTools.ts
  // doesn't always catch them. Excluded explicitly instead.
  "AttachmentsController_upload_v1",
  "AttachmentsController_replace_v1",
  "BulkController_startBulkUpload_v1",
  "ImportController_uploadFile_v1",
  "ImportController_importFull_v1",
]);
 */
export async function createServer(): Promise<McpServer> {
  const server = new McpServer({ name: "expense-tracker", version: "1.0.0" });

  /*   registerAddExpense(server);
  registerListExpenses(server);
  registerGetExpense(server);
  registerUpdateExpense(server);
  registerRemoveExpense(server);
  registerGetExpenseTotals(server);
  registerListCategories(server); */

  try {
    const { registered } = await registerOpenApiTools(server, {
      skipOperationIds: new Set(),
    });
    console.error(
      `[expense-tracker-mcp] Registered ${registered} additional tools from the OpenAPI spec.`,
    );
  } catch (err) {
    console.error(
      "[expense-tracker-mcp] Could not load the OpenAPI spec — continuing with the curated tools only:",
      err instanceof Error ? err.message : String(err),
    );
  }

  return server;
}

async function main() {
  console.error("[expense-tracker-mcp] Serving via stdio.");
  await serveStdio(createServer);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
