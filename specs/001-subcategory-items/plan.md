# Implementation Plan: Expense Item Tracking

**Branch**: `001-subcategory-items` | **Date**: November 25, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-subcategory-items/spec.md`

## Summary

This feature adds the ability to track individual line items within expense transactions, enabling users to split a single receipt (e.g., Costco purchase) across multiple categories and subcategories while maintaining the relationship to the parent expense. The implementation maintains full backward compatibility with existing expenses that have no items, ensuring zero breaking changes to existing functionality.

**Core Value**: Granular expense tracking at the item level (e.g., tshirt $30 under Clothing, milk $10 under Groceries from one $40 Costco trip).

**Technical Approach**: 
- Add new `expense_items` table with foreign key to `expenses`
- Extend backend NestJS API with nested item CRUD operations
- Enhance React frontend forms and detail views to manage items
- Maintain backward compatibility by making items optional (zero-to-many relationship)

## Technical Context

**Language/Version**: TypeScript (strict mode) - Backend: Node.js 18+, Frontend: ES2020+  
**Primary Dependencies**: 
- Backend: NestJS 10.x, Prisma 5.x ORM, PostgreSQL 14+
- Frontend: React 18.x, TanStack Router 1.x, TanStack Query 5.x, React Hook Form 7.x, Bootstrap 5.x  
**Storage**: PostgreSQL with Prisma migrations (Flyway for versioning compatibility)  
**Testing**: Vitest (unit/contract), Playwright (E2E for P1 user journeys)  
**Target Platform**: Web application (responsive, desktop + mobile browsers)  
**Project Type**: Full-stack web (backend REST API + frontend SPA)  
**Performance Goals**: 
- Item CRUD operations < 400ms p95 latency
- Expense detail view with 50 items loads < 500ms
- CSV import 500 expenses × 3 items < 30 seconds  
**Constraints**: 
- No breaking changes to existing expense API contracts
- Backward compatibility: all existing expenses (without items) continue to function
- Database migrations must be backward-compatible (existing code works during deployment)
- Maintain < 250KB gzipped frontend bundle size  
**Scale/Scope**: 
- Support 50+ items per expense without UI degradation
- 10,000+ item records for reporting queries (< 2 seconds)
- Existing ~1000 expenses remain functional

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Code Quality & Maintainability
✅ **COMPLIANT** - TypeScript strict mode enforced
- New DTOs with `class-validator` for item validation
- Prisma schema changes maintain referential integrity
- JSDoc comments required for new service methods
- No breaking changes to existing module exports

**Action**: ExpenseItem entity, DTOs, and services follow existing NestJS patterns

### Principle II: Test Discipline & Coverage
✅ **COMPLIANT** - TDD approach for P1 features
- Backend contract tests for item CRUD endpoints (status codes, schemas)
- Frontend unit tests for item form components and validation hooks
- Playwright E2E tests for P1 user journey: create expense with items
- Minimum coverage: backend 85% lines, frontend critical logic 80%

**Action**: Tests written before implementation; regression test for item-sum validation

### Principle III: UX Consistency & Accessibility
✅ **COMPLIANT** - Bootstrap 5 + TanStack patterns
- Item form uses existing Bootstrap form components
- TanStack Query for item server state
- React Hook Form for item form validation
- WCAG AA: keyboard navigation, focus indicators, color contrast ≥ 4.5:1
- Loading states and error boundaries for item operations

**Action**: Reuse `frontend/src/components/layout/` patterns; accessible item list with keyboard nav

### Principle IV: Performance & Efficiency
⚠️ **REQUIRES VALIDATION** - Performance budgets must be verified
- API endpoint item inclusion adds query complexity (N+1 risk)
- Frontend bundle size impact from item form components
- Database indexes needed for item queries (expense_id, category_id)

**Action**: 
- Phase 0: Research Prisma `include` optimization and index strategy
- Phase 1: Design queries to avoid N+1 (use `include` with proper indexes)
- Validate bundle size impact after implementation (Vite analyzer)

**Gates**: ✅ Code quality defined | ✅ Test strategy defined | ✅ UX patterns identified | ⚠️ Performance validation pending

## Project Structure

### Documentation (this feature)

```text
specs/001-subcategory-items/
├── plan.md              # This file
├── research.md          # Phase 0: Prisma patterns, validation strategy, index design
├── data-model.md        # Phase 1: ExpenseItem schema, relationships, constraints
├── quickstart.md        # Phase 1: Developer guide for working with items
├── contracts/           # Phase 1: API contracts for item endpoints
│   ├── create-item.json
│   ├── update-item.json
│   ├── list-items.json
│   └── delete-item.json
└── tasks.md             # Phase 2: Implementation tasks (NOT created by this plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   └── expenses/
│   │       ├── dto/
│   │       │   ├── create-expense-item.dto.ts       # NEW: Item creation DTO
│   │       │   ├── update-expense-item.dto.ts       # NEW: Item update DTO
│   │       │   ├── expense-item-response.dto.ts     # NEW: Item response DTO
│   │       │   ├── create-expense.dto.ts            # MODIFIED: Add optional items array
│   │       │   └── expense-response.dto.ts          # MODIFIED: Add items array
│   │       ├── expenses.controller.ts               # MODIFIED: Add item endpoints
│   │       ├── expenses.service.ts                  # MODIFIED: Add item CRUD methods
│   │       └── expenses.module.ts                   # No changes (items are part of expenses)
│   └── prisma/
│       └── schema.prisma                             # MODIFIED: Add ExpenseItem model
├── migrations/
│   └── V2.7.0__expense_items.sql                    # NEW: Create expense_items table
└── tests/
    ├── contract/
    │   └── expense-items.spec.ts                     # NEW: Item endpoint contract tests
    └── unit/
        └── expenses-items.service.spec.ts            # NEW: Item service unit tests

frontend/
├── src/
│   ├── features/
│   │   └── expenses/
│   │       ├── components/
│   │       │   ├── ExpenseItemForm.tsx              # NEW: Item add/edit form
│   │       │   ├── ExpenseItemList.tsx              # NEW: Item list display
│   │       │   ├── ExpenseForm.tsx                  # MODIFIED: Include item management
│   │       │   └── ExpenseDetail.tsx                # MODIFIED: Display items
│   │       ├── api/
│   │       │   └── expenseApi.ts                    # MODIFIED: Add item CRUD hooks
│   │       └── types/
│   │           └── expense.ts                        # MODIFIED: Add ExpenseItem type
│   └── types/
│       └── expense-item.ts                           # NEW: ExpenseItem TypeScript types
└── tests/
    ├── unit/
    │   └── ExpenseItemForm.test.tsx                  # NEW: Item form unit tests
    └── e2e/
        └── expense-with-items.spec.ts                # NEW: E2E test for item creation
```

**Structure Decision**: Web application structure (backend REST API + frontend SPA). Items are logically part of the expenses domain, so they are co-located within the `expenses` module rather than creating a separate module. This maintains cohesion and simplifies transaction management (creating expense with items in single transaction).

## Phase 0: Research & Discovery

**Goal**: Resolve all NEEDS CLARIFICATION items and establish implementation patterns.

### Research Tasks

1. **Prisma Nested Operations Pattern**
   - Research: How to handle nested create/update for items within expense transactions
   - Question: Should we use Prisma's nested create syntax or separate item operations?
   - Output: Pattern decision with code examples in `research.md`

2. **Validation Strategy**
   - Research: Best approach for validating item amounts sum ≤ expense total
   - Question: Database constraint, application-level validation, or both?
   - Output: Validation strategy with error handling patterns

3. **Index Strategy**
   - Research: Required indexes for item queries (by expense, by category, by name search)
   - Question: Which columns need indexes for optimal performance?
   - Output: Index recommendations with EXPLAIN analysis

4. **Backward Compatibility Verification**
   - Research: Ensure existing expense queries work with optional items relationship
   - Question: Does adding `items` relation break any existing Prisma queries?
   - Output: Compatibility verification and migration strategy

5. **Form UX Pattern**
   - Research: Dynamic form arrays in React Hook Form for adding/removing items
   - Question: What's the best UX for managing variable-length item lists?
   - Output: Component design with accessibility considerations

6. **Bulk Import Strategy**
   - Research: CSV import format for expenses with items (P3 feature)
   - Question: Nested JSON in CSV cells or separate item rows with expense ID?
   - Output: Import format specification (deferred to P3 if needed)

### Research Output: `research.md`

Document decisions for each research task with:
- **Decision**: What was chosen
- **Rationale**: Why it was chosen
- **Alternatives Considered**: What else was evaluated
- **Code Examples**: Concrete implementation snippets

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete with all clarifications resolved

### 1. Data Model Design (`data-model.md`)

Define the `ExpenseItem` entity with complete schema:

```typescript
// Conceptual model (Prisma schema in implementation)
model ExpenseItem {
  id            String      @id @default(uuid)
  expenseId     String      // Foreign key to Expense
  name          String      // Item description (max 200 chars)
  amount        Decimal     // Item amount (10,2 precision)
  categoryId    String?     // Optional: item-level category
  subcategoryId String?     // Optional: item-level subcategory
  notes         String?     // Optional: additional details
  createdAt     DateTime
  updatedAt     DateTime
  deletedAt     DateTime?   // Soft delete
  
  // Relations
  expense       Expense
  category      Category?
  subcategory   Subcategory?
}

// Expense model modification
model Expense {
  // ... existing fields ...
  items         ExpenseItem[]  // One-to-many relationship
}
```

**Constraints**:
- `amount` > 0 (CHECK constraint)
- `subcategoryId` must belong to `categoryId` (application validation)
- Sum of item amounts ≤ expense.amount (application validation)
- Cascade soft delete: expense.deletedAt propagates to items

**Indexes**:
- `idx_expense_items_expense_id` on `expenseId` (query items by expense)
- `idx_expense_items_category_id` on `categoryId` (filter by category)
- `idx_expense_items_name` GIN index on `name` (full-text search)

### 2. API Contract Design (`contracts/`)

#### POST `/api/expenses/:id/items` - Create Item
```json
{
  "request": {
    "name": "string (required, max 200 chars)",
    "amount": "number (required, > 0)",
    "categoryId": "string (optional, uuid)",
    "subcategoryId": "string (optional, uuid)",
    "notes": "string (optional)"
  },
  "response": {
    "id": "string (uuid)",
    "expenseId": "string (uuid)",
    "name": "string",
    "amount": "number",
    "category": "Category | null",
    "subcategory": "Subcategory | null",
    "notes": "string | null",
    "createdAt": "ISO 8601 string",
    "updatedAt": "ISO 8601 string"
  },
  "errors": {
    "400": "Validation error (amount ≤ 0, sum exceeds expense total, name too long)",
    "404": "Expense not found",
    "403": "Forbidden (expense doesn't belong to user)"
  }
}
```

#### PUT `/api/expenses/:id/items/:itemId` - Update Item
Similar structure to POST, allows partial updates.

#### GET `/api/expenses/:id/items` - List Items
Returns array of items for an expense (with category/subcategory populated).

#### DELETE `/api/expenses/:id/items/:itemId` - Delete Item
Soft delete item, recalculate expense validation.

#### MODIFIED: POST `/api/expenses` - Create Expense with Items
```json
{
  "request": {
    "// ... existing expense fields ...": "...",
    "items": [
      {
        "name": "string",
        "amount": "number",
        "categoryId": "string (optional)",
        "subcategoryId": "string (optional)",
        "notes": "string (optional)"
      }
    ]
  }
}
```

#### MODIFIED: GET `/api/expenses/:id` - Get Expense with Items
Response includes `items` array with populated categories.

### 3. Frontend Component Design

**ExpenseItemForm.tsx**: Dynamic form array component
- Add/remove item rows
- Per-item validation (name required, amount > 0)
- Category/subcategory dropdowns per item
- Display running total vs expense amount
- Validation: sum ≤ expense.amount

**ExpenseItemList.tsx**: Display items in expense detail
- Table view with columns: Name, Amount, Category, Subcategory, Actions
- Inline edit capability (or modal)
- Delete confirmation
- Sum display with "Untracked: $X" if sum < expense.amount

### 4. Agent Context Update

Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot` to add:
- ExpenseItem entity pattern
- Item validation rules
- Nested create/update patterns

### 5. Constitution Re-check

After design phase, validate:
- ✅ Prisma queries avoid N+1 (use `include: { items: true }`)
- ✅ Indexes support common queries
- ✅ API contracts maintain backward compatibility (items array absent for existing expenses)
- ✅ Frontend components reuse Bootstrap patterns

## Phase 2: Task Breakdown (Deferred to `/speckit.tasks`)

This phase is handled by the `/speckit.tasks` command, which will generate detailed implementation tasks based on this plan and the artifacts from Phase 0 and Phase 1.

Expected task categories:
1. **Database Tasks**: Migration, indexes, constraints
2. **Backend Tasks**: DTOs, service methods, controller endpoints, validation
3. **Frontend Tasks**: Types, API hooks, form components, detail views
4. **Testing Tasks**: Contract tests, unit tests, E2E tests
5. **Documentation Tasks**: Update API docs, developer guides

## Complexity Tracking

> No violations - Constitution gates passed with one pending validation.

| Item | Status | Notes |
|------|--------|-------|
| Performance Validation | ⚠️ Pending | Must verify no N+1 queries and bundle size impact in Phase 1 |

**Justification**: Performance validation is standard practice for new features, not a violation. Will be confirmed during Phase 1 design with Prisma query analysis and Vite bundle analyzer.

## Success Metrics Mapping

Mapping spec success criteria to implementation checkpoints:

- **SC-001** (Create 5 items < 60s): Frontend form UX with minimal friction
- **SC-002** (Display < 500ms): Backend `include` optimization + frontend rendering
- **SC-003** (List loads < 1s): Item count in expense list query (no N+1)
- **SC-004** (Search < 1s): GIN index on item name + proper query structure
- **SC-005** (Validation < 200ms): Client-side React Hook Form validation
- **SC-006** (Reports < 5s): Proper indexes on category/subcategory joins
- **SC-007** (Import 500×3 < 30s): Bulk insert optimization (P3 feature)
- **SC-008** (95% success rate): Clear validation messages and UX testing
- **SC-009** (Zero data loss): Transaction-based updates with rollback
- **SC-010** (50 items no degradation): Frontend virtualization if needed
- **SC-011** (10k items < 2s queries): Database indexes + query optimization
- **SC-012** (Export 500 < 10s): Streaming response for large datasets

## Risk Assessment

### High Risk
- **Performance degradation**: Adding items to every expense query could slow existing pages
  - **Mitigation**: Make `include: { items: true }` optional; only fetch when needed (detail view)
  
### Medium Risk
- **Validation complexity**: Ensuring item sum ≤ expense total across concurrent edits
  - **Mitigation**: Database-level CHECK constraint + optimistic locking in service layer
  
- **Migration complexity**: Adding items relation to existing expenses
  - **Mitigation**: Migration is additive (new table, new optional relation); no data transformation

### Low Risk
- **UI complexity**: Managing dynamic item forms
  - **Mitigation**: Well-established pattern with React Hook Form `useFieldArray`

## Dependencies & Assumptions

**Dependencies**:
- No external service dependencies
- Relies on existing Category and Subcategory tables
- Uses existing Prisma/NestJS patterns

**Assumptions**:
1. Existing expenses without items represent valid use cases (gas, parking, etc.)
2. Users will gradually adopt item tracking, not backfill all historical expenses
3. Most expenses will have 1-5 items; 50 items is edge case requiring special handling
4. Item-level budget tracking can leverage existing category budget logic
5. CSV import with items (P3) can be deferred without blocking P1/P2 value

**Breaking Change Prevention**:
- All item fields added as optional in expense response (backward compatible)
- Existing expense APIs work without modification
- Frontend displays expenses gracefully with or without items
- Database migration is non-destructive (no column drops or renames)

## Notes

This implementation maintains strict backward compatibility by:
1. Making items a separate, optional entity (zero-to-many relationship)
2. Preserving all existing expense API contracts (items simply absent in response)
3. Using additive database changes only (new table, no existing table modifications beyond adding relation)
4. Frontend components conditionally display items section only when items exist

The phased priority approach (P1: CRUD, P2: Analytics, P3: Import) allows incremental delivery without blocking user value at each stage.
