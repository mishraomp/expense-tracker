import { z, type ZodTypeAny } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { apiRequestByPath, getApiOrigin } from "./apiClient.js";
import { runTool, textResult, errorResult } from "./toolHelpers.js";

// zod v4's own ZodRawShape is Readonly<{...}>, which rejects the index-assignment
// pattern used below while building a shape up field by field.
type MutableShape = Record<string, ZodTypeAny>;

interface OpenApiSchema {
  type?: string;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  enum?: Array<string | number | boolean>;
  description?: string;
  $ref?: string;
  nullable?: boolean;
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  additionalProperties?: boolean | OpenApiSchema;
}

interface OpenApiParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema?: OpenApiSchema;
}

interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  requestBody?: { content?: Record<string, { schema?: OpenApiSchema }> };
}

interface OpenApiDoc {
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, OpenApiSchema> };
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

function resolveSchema(
  schema: OpenApiSchema,
  components: Record<string, OpenApiSchema>,
): OpenApiSchema {
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop() ?? "";
    return components[name] ?? {};
  }
  return schema;
}

function unionSchemas(
  schemas: OpenApiSchema[],
  components: Record<string, OpenApiSchema>,
): ZodTypeAny {
  const options = schemas.map((option) => schemaToZod(option, components));
  if (options.length === 0) return z.unknown();
  if (options.length === 1) return options[0];
  return z.union(options as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
}

function enumSchema(values: Array<string | number | boolean>): ZodTypeAny {
  if (values.every((value): value is string => typeof value === "string")) {
    return z.enum(values as [string, ...string[]]);
  }
  const literals = values.map((value) => z.literal(value));
  if (literals.length === 1) return literals[0];
  return z.union(
    literals as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]],
  );
}

function schemaToZod(
  schema: OpenApiSchema,
  components: Record<string, OpenApiSchema>,
): ZodTypeAny {
  const resolved = resolveSchema(schema, components);

  let zodType: ZodTypeAny;
  if (resolved.oneOf && resolved.oneOf.length > 0) {
    zodType = unionSchemas(resolved.oneOf, components);
  } else if (resolved.anyOf && resolved.anyOf.length > 0) {
    zodType = unionSchemas(resolved.anyOf, components);
  } else if (resolved.allOf && resolved.allOf.length > 0) {
    const [first, ...rest] = resolved.allOf.map((option) =>
      schemaToZod(option, components),
    );
    zodType = rest.reduce(
      (combined, option) => z.intersection(combined, option),
      first ?? z.unknown(),
    );
  } else if (resolved.enum && resolved.enum.length > 0) {
    zodType = enumSchema(resolved.enum);
  } else if (resolved.type === "array") {
    zodType = z.array(
      resolved.items ? schemaToZod(resolved.items, components) : z.unknown(),
    );
  } else if (resolved.type === "object" || resolved.properties) {
    const shape: MutableShape = {};
    const required = new Set(resolved.required ?? []);
    for (const [key, propSchema] of Object.entries(resolved.properties ?? {})) {
      shape[key] = fieldToZod(propSchema, components, required.has(key));
    }
    if (
      resolved.additionalProperties &&
      typeof resolved.additionalProperties === "object"
    ) {
      zodType = z.record(
        z.string(),
        schemaToZod(resolved.additionalProperties, components),
      );
    } else {
      zodType = z.object(shape).passthrough();
    }
  } else if (resolved.type === "integer" || resolved.type === "number") {
    zodType = z.number();
  } else if (resolved.type === "boolean") {
    zodType = z.boolean();
  } else {
    zodType = z.string();
  }
  return resolved.nullable ? zodType.nullable() : zodType;
}

function fieldToZod(
  schema: OpenApiSchema,
  components: Record<string, OpenApiSchema>,
  required: boolean,
): ZodTypeAny {
  const resolved = resolveSchema(schema, components);
  let field = schemaToZod(schema, components);
  if (resolved.description) {
    field = field.describe(resolved.description);
  }
  return required ? field : field.optional();
}

/** Tool names must be simple identifiers — turn "ExpensesController_getTotals_v1"
 *  into "expenses_get_totals" for a name an LLM can read at a glance. */
function toolNameFromOperationId(operationId: string): string {
  return operationId
    .replace(/Controller_/, "_")
    .replace(/_v\d+$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

async function fetchOpenApiDoc(): Promise<OpenApiDoc> {
  const url = `${getApiOrigin()}/api/docs-json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenAPI spec from ${url}: HTTP ${response.status}`,
    );
  }
  return (await response.json()) as OpenApiDoc;
}

/** True when an operation's request body is declared as something other than
 *  plain JSON (e.g. multipart/form-data file uploads). There's no file to attach
 *  to an MCP tool call in this architecture, so these can't be represented as a
 *  generic JSON-in/JSON-out tool — they're skipped rather than registered broken. */
function requiresNonJsonBody(operation: OpenApiOperation): boolean {
  const contentTypes = Object.keys(operation.requestBody?.content ?? {});
  return contentTypes.length > 0 && !contentTypes.includes("application/json");
}

/**
 * Auto-registers one MCP tool per OpenAPI operation the backend exposes, so the MCP
 * server's capability tracks the API's capability without hand-writing a tool per
 * endpoint. Operations already covered by a curated, hand-written tool (see
 * `skipOperationIds`) are skipped to avoid registering two tools for one endpoint.
 *
 * Coverage is intentionally NOT total:
 *  - multipart/form-data operations (file uploads) are always skipped — there's no
 *    way to attach file bytes to a JSON tool call, so a generic wrapper can't work.
 *  - `skipOperationIds` additionally excludes anything the caller knows can't behave
 *    as a plain request/response tool for other reasons (e.g. a browser-redirect OAuth
 *    handshake, or a binary non-JSON response body a generic JSON-parsing wrapper
 *    would choke on).
 */
export async function registerOpenApiTools(
  server: McpServer,
  options: { skipOperationIds?: Set<string> } = {},
): Promise<{ registered: number; skipped: string[] }> {
  const skip = options.skipOperationIds ?? new Set<string>();
  const doc = await fetchOpenApiDoc();
  const components = doc.components?.schemas ?? {};
  const skippedNames: string[] = [];
  let registered = 0;

  for (const [pathTemplate, methods] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = methods[method] as OpenApiOperation | undefined;
      if (!operation?.operationId) continue;

      if (skip.has(operation.operationId)) {
        skippedNames.push(`${operation.operationId} (excluded)`);
        continue;
      }
      if (requiresNonJsonBody(operation)) {
        skippedNames.push(`${operation.operationId} (non-JSON request body)`);
        continue;
      }

      registerOperationAsTool(
        server,
        pathTemplate,
        method,
        operation,
        components,
      );
      registered++;
    }
  }

  return { registered, skipped: skippedNames };
}

function registerOperationAsTool(
  server: McpServer,
  pathTemplate: string,
  method: HttpMethod,
  operation: OpenApiOperation,
  components: Record<string, OpenApiSchema>,
): void {
  const toolName = toolNameFromOperationId(operation.operationId!);
  const parameters = operation.parameters ?? [];
  const pathParamNames = parameters
    .filter((p) => p.in === "path")
    .map((p) => p.name);
  const queryParamNames = parameters
    .filter((p) => p.in === "query")
    .map((p) => p.name);

  const shape: MutableShape = {};
  for (const param of parameters) {
    if (param.in !== "path" && param.in !== "query") continue;
    shape[param.name] = fieldToZod(
      param.schema ?? { type: "string" },
      components,
      Boolean(param.required),
    ).describe(param.description ?? `${param.in} parameter "${param.name}"`);
  }

  const bodySchemaRaw =
    operation.requestBody?.content?.["application/json"]?.schema;
  const bodySchema = bodySchemaRaw
    ? resolveSchema(bodySchemaRaw, components)
    : undefined;
  const isArrayBody = bodySchema?.type === "array";
  const bodyKeys =
    bodySchema && !isArrayBody ? Object.keys(bodySchema.properties ?? {}) : [];

  if (isArrayBody) {
    shape["items"] = fieldToZod(bodySchema!, components, true).describe(
      "Request body array",
    );
  } else if (bodySchema) {
    const required = new Set(bodySchema.required ?? []);
    for (const [key, propSchema] of Object.entries(
      bodySchema.properties ?? {},
    )) {
      shape[key] = fieldToZod(propSchema, components, required.has(key));
    }
  }

  server.registerTool(
    toolName,
    {
      title: operation.summary || toolName,
      description:
        operation.description ||
        operation.summary ||
        `${method.toUpperCase()} ${pathTemplate} (auto-generated from the OpenAPI spec)`,
      inputSchema: z.object(shape),
    },
    async (args: Record<string, unknown>) =>
      runTool(toolName, args, async () => {
        let resolvedPath = pathTemplate;
        for (const name of pathParamNames) {
          resolvedPath = resolvedPath.replace(
            `{${name}}`,
            encodeURIComponent(String(args[name] ?? "")),
          );
        }

        const query: Record<string, string> = {};
        for (const name of queryParamNames) {
          if (args[name] !== undefined) query[name] = String(args[name]);
        }

        let body: unknown;
        if (isArrayBody) {
          body = args["items"];
        } else if (bodyKeys.length > 0) {
          body = Object.fromEntries(
            bodyKeys
              .filter((k) => args[k] !== undefined)
              .map((k) => [k, args[k]]),
          );
        }

        try {
          const result = await apiRequestByPath(resolvedPath, {
            method: method.toUpperCase() as
              | "GET"
              | "POST"
              | "PUT"
              | "PATCH"
              | "DELETE",
            query: Object.keys(query).length > 0 ? query : undefined,
            body,
          });
          return textResult(
            result === undefined
              ? "OK (no content)"
              : JSON.stringify(result, null, 2),
          );
        } catch (err) {
          return errorResult(err);
        }
      }),
  );
}
