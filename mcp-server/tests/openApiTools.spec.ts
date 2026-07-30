import { afterEach, describe, expect, it, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/server";
import { registerOpenApiTools } from "../src/openApiTools.js";

describe("registerOpenApiTools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserves nullable union fields from the OpenAPI request schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          paths: {
            "/api/v1/categories/{id}": {
              put: {
                operationId: "CategoriesController_update_v1",
                parameters: [
                  {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                  },
                ],
                requestBody: {
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/UpdateCategoryDto",
                      },
                    },
                  },
                },
              },
            },
          },
          components: {
            schemas: {
              UpdateCategoryDto: {
                type: "object",
                properties: {
                  budgetAmount: {
                    nullable: true,
                    oneOf: [{ type: "string" }, { type: "number" }],
                  },
                  budgetPeriod: {
                    nullable: true,
                    enum: ["monthly", "annual"],
                  },
                },
              },
            },
          },
        }),
      }),
    );
    const registerTool = vi.fn();
    const server = { registerTool } as unknown as McpServer;

    await registerOpenApiTools(server);

    const definition = registerTool.mock.calls[0]?.[1];
    expect(definition).toBeDefined();
    expect(
      definition!.inputSchema.safeParse({
        id: "category-id",
        budgetAmount: 12.5,
      }).success,
    ).toBe(true);
    expect(
      definition!.inputSchema.safeParse({
        id: "category-id",
        budgetAmount: null,
      }).success,
    ).toBe(true);
    expect(
      definition!.inputSchema.safeParse({
        id: "category-id",
        budgetPeriod: null,
      }).success,
    ).toBe(true);
    expect(
      definition!.inputSchema.safeParse({
        id: "category-id",
        budgetAmount: false,
      }).success,
    ).toBe(false);
  });
});
