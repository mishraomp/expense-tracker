import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/tools/addExpense.js", () => ({ registerAddExpense: vi.fn() }));
vi.mock("../src/tools/listExpenses.js", () => ({
  registerListExpenses: vi.fn(),
}));
vi.mock("../src/tools/getExpense.js", () => ({ registerGetExpense: vi.fn() }));
vi.mock("../src/tools/updateExpense.js", () => ({
  registerUpdateExpense: vi.fn(),
}));
vi.mock("../src/tools/removeExpense.js", () => ({
  registerRemoveExpense: vi.fn(),
}));
vi.mock("../src/tools/getExpenseTotals.js", () => ({
  registerGetExpenseTotals: vi.fn(),
}));
vi.mock("../src/tools/listCategories.js", () => ({
  registerListCategories: vi.fn(),
}));
vi.mock("../src/openApiTools.js", () => ({
  registerOpenApiTools: vi
    .fn()
    .mockResolvedValue({ registered: 0, skipped: [] }),
}));

import { createServer } from "../src/index.js";
import { registerAddExpense } from "../src/tools/addExpense.js";
import { registerListExpenses } from "../src/tools/listExpenses.js";
import { registerGetExpense } from "../src/tools/getExpense.js";
import { registerUpdateExpense } from "../src/tools/updateExpense.js";
import { registerRemoveExpense } from "../src/tools/removeExpense.js";
import { registerGetExpenseTotals } from "../src/tools/getExpenseTotals.js";
import { registerListCategories } from "../src/tools/listCategories.js";

describe("createServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the curated expense CRUD tools", async () => {
    await createServer();

    expect(registerAddExpense).toHaveBeenCalledOnce();
    expect(registerListExpenses).toHaveBeenCalledOnce();
    expect(registerGetExpense).toHaveBeenCalledOnce();
    expect(registerUpdateExpense).toHaveBeenCalledOnce();
    expect(registerRemoveExpense).toHaveBeenCalledOnce();
    expect(registerGetExpenseTotals).toHaveBeenCalledOnce();
    expect(registerListCategories).toHaveBeenCalledOnce();
  });
});
