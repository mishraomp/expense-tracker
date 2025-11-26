# Feature Specification: Expense Item Tracking

**Feature Branch**: `001-subcategory-items`  
**Created**: November 25, 2025  
**Status**: Draft  
**Input**: User description: "Update the application to track individual items inside an expense, for category and sub category. For example: Costco, Clothing, tshirt(item). Make this change holistic across the app"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Expense with Multiple Items (Priority: P1)

A user shops at Costco and purchases multiple items across different categories. They want to record one expense transaction but track the individual items purchased (e.g., tshirt under Clothing, milk under Groceries, book under Entertainment). This allows them to split a single receipt/transaction across multiple categories and subcategories while maintaining the relationship to the original expense.

**Why this priority**: This is the core functionality that enables granular expense tracking. Without this, users cannot track what they actually bought, only where they spent money. This delivers immediate value by providing detailed spending insights.

**Independent Test**: Can be fully tested by creating a new expense, adding multiple items with different amounts and categories, and verifying the total matches the receipt. Delivers the value of detailed expense breakdown from a single transaction.

**Acceptance Scenarios**:

1. **Given** a user is creating a new expense for $150 at Costco, **When** they add three items: "tshirt" ($30, Clothing/Casual), "milk" ($10, Groceries/Dairy), and "book" ($110, Entertainment/Books), **Then** the system saves all three items linked to the expense and the total ($150) is correctly calculated
2. **Given** a user has created an expense with multiple items, **When** they view the expense details, **Then** they see a breakdown showing each item name, amount, category, and subcategory
3. **Given** a user is adding items to an expense, **When** the sum of all item amounts exceeds the expense total, **Then** the system displays a validation error preventing submission
4. **Given** a user is adding items to an expense, **When** they leave an item without a name or amount, **Then** the system displays validation errors for required fields

---

### User Story 2 - Edit and Manage Expense Items (Priority: P1)

A user realizes they made a mistake in categorizing an item or entered the wrong amount. They need to edit existing items, add new items they forgot, or remove items they entered incorrectly without deleting the entire expense.

**Why this priority**: Data entry errors are common and users need the ability to correct mistakes. Without edit capability, the feature becomes frustrating and unusable in real-world scenarios.

**Independent Test**: Can be tested by creating an expense with items, then modifying item details (name, amount, category), adding new items, and removing items. Verifies CRUD operations work correctly for items.

**Acceptance Scenarios**:

1. **Given** an expense exists with three items, **When** the user edits one item's amount from $30 to $35, **Then** the item is updated and the expense total is recalculated correctly
2. **Given** an expense exists with two items, **When** the user adds a third item they forgot to include initially, **Then** the new item is saved and linked to the expense with total recalculated
3. **Given** an expense exists with three items, **When** the user deletes one item, **Then** the item is removed and the expense total reflects only the remaining two items
4. **Given** an expense exists with items totaling $100, **When** the user edits items so the new total is $120 but the expense amount is still $100, **Then** the system displays a validation error

---

### User Story 3 - View Item-Level Reports and Analytics (Priority: P2)

A user wants to understand their spending patterns at the item level, not just category level. For example, they want to see how much they spent on coffee across all expenses, or which specific items consume most of their grocery budget.

**Why this priority**: This unlocks the analytical value of item-level tracking. While P1 focuses on data entry, this focuses on insights, which is the ultimate goal but can come after basic CRUD operations are working.

**Independent Test**: Can be tested by creating multiple expenses with overlapping item names across different merchants, then generating reports filtered by item name, category, or date range. Delivers value by revealing spending patterns at granular level.

**Acceptance Scenarios**:

1. **Given** a user has multiple expenses with "coffee" items across different merchants, **When** they search for expenses containing "coffee", **Then** they see all expenses with coffee items and the total amount spent on coffee
2. **Given** a user has expenses spanning three months, **When** they generate a monthly breakdown report filtered by category "Groceries" and subcategory "Dairy", **Then** they see all dairy items grouped by month with totals
3. **Given** a user has multiple items under various categories, **When** they view the top 10 most expensive items, **Then** the system displays items sorted by amount regardless of which expense they belong to
4. **Given** a user wants to export their item-level data, **When** they export expenses for tax purposes, **Then** the export includes all item details (name, amount, category, subcategory) for each expense

---

### User Story 4 - Bulk Import Expenses with Items (Priority: P3)

A user has a CSV or spreadsheet from their bank or receipt scanning app that includes itemized transaction data. They want to import this data including the item breakdown without manually entering each expense and item.

**Why this priority**: This is a power-user feature that enhances usability but isn't critical for MVP. Users can still manually enter items initially, making this a nice-to-have rather than must-have.

**Independent Test**: Can be tested by preparing a CSV with expense and item columns, importing it, and verifying all expenses and items are created correctly with proper relationships.

**Acceptance Scenarios**:

1. **Given** a user has a CSV file with columns for expense details and comma-separated items, **When** they import the file, **Then** the system creates expenses with all items correctly linked
2. **Given** a CSV import contains invalid item data (e.g., negative amounts, missing category), **When** the import is processed, **Then** the system reports validation errors with specific line numbers while importing valid items
3. **Given** a user imports expenses with items, **When** an expense already exists with the same date, merchant, and amount, **Then** the system detects the duplicate and skips it without creating duplicate items

---

### User Story 5 - Handle Expenses Without Items (Priority: P1)

A user makes a simple expense (gas fill-up, parking fee) where they don't need or want to track individual items. The system should allow expenses to exist without any items, maintaining backward compatibility with existing expense entries.

**Why this priority**: Critical for backward compatibility. Existing expenses don't have items, and many future expenses won't need item-level detail. The system must support both patterns.

**Independent Test**: Can be tested by creating expenses with zero items, verifying they display and function correctly, and ensuring existing expenses without items continue to work.

**Acceptance Scenarios**:

1. **Given** a user creates a new expense for $50 gas without adding any items, **When** they save the expense, **Then** the expense is saved successfully with total amount of $50 and zero items
2. **Given** an existing expense has no items, **When** the user views it, **Then** the UI displays the expense normally without showing an empty items section
3. **Given** an expense has no items, **When** generating reports, **Then** the expense is included using its category and amount at the expense level
4. **Given** a user views a list of expenses mixing those with and without items, **When** they apply filters, **Then** both types of expenses are searchable and filterable appropriately

---

### Edge Cases

- What happens when a user creates items that sum to less than the expense total? (Allow partial itemization; the difference represents untracked portion)
- What happens when a user deletes all items from an expense that previously had items? (Expense reverts to non-itemized state)
- How does the system handle very long item names (>100 characters)? (Limit input to 200 characters maximum)
- What if an item's category/subcategory doesn't match the expense's category? (Items can have different categories than parent expense, enabling split transactions)
- How are items handled during expense deletion? (Cascade delete - when expense is soft-deleted, all items are also soft-deleted)
- What happens when importing expenses where item amounts sum incorrectly? (Flag as validation error and reject the expense during import)
- Can a user search for expenses by item name? (Yes, item names should be searchable alongside expense descriptions)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add zero or more items to any expense
- **FR-002**: System MUST store for each item: name (required), amount (required, positive decimal), category (optional), subcategory (optional), notes (optional)
- **FR-003**: System MUST validate that all item amounts within an expense sum to less than or equal to the expense total amount
- **FR-004**: System MUST display a warning when item amounts sum to less than expense amount, indicating untracked funds
- **FR-005**: System MUST allow items to have different categories/subcategories than the parent expense
- **FR-006**: System MUST support full CRUD operations on items (create, read, update, delete)
- **FR-007**: System MUST recalculate and validate expense totals whenever items are added, updated, or deleted
- **FR-008**: System MUST maintain referential integrity between expenses and items (cascade soft delete)
- **FR-009**: System MUST display item count and itemized status in expense list views
- **FR-010**: System MUST provide detailed item breakdown in expense detail view
- **FR-011**: System MUST allow searching expenses by item name in addition to existing search criteria
- **FR-012**: System MUST include item-level data in expense export functionality
- **FR-013**: System MUST support importing expenses with items from CSV format
- **FR-014**: System MUST include items in duplicate detection logic (same expense can have different items, making it non-duplicate)
- **FR-015**: System MUST handle backward compatibility with existing expenses that have no items
- **FR-016**: Reports and analytics MUST aggregate data at both expense-level and item-level
- **FR-017**: Category/subcategory budget tracking MUST account for item-level categorization
- **FR-018**: System MUST allow filtering reports by item properties (name, category, subcategory)
- **FR-019**: System MUST display item-level insights (top items by spend, frequent purchases, etc.)
- **FR-020**: System MUST soft-delete items when parent expense is soft-deleted
- **FR-021**: System MUST prevent saving items with negative or zero amounts
- **FR-022**: System MUST trim and sanitize item names to prevent injection attacks
- **FR-023**: System MUST limit item names to 200 characters maximum
- **FR-024**: System MUST support adding items during expense creation and editing
- **FR-025**: Item categories/subcategories MUST reference the same category/subcategory tables used by expenses

### Key Entities

- **ExpenseItem**: Represents an individual line item within an expense transaction
  - Links to parent Expense (required, foreign key)
  - Has name/description (required, string, max 200 chars)
  - Has amount (required, positive decimal, precision 10,2)
  - Has category (optional, references Category table)
  - Has subcategory (optional, references Subcategory table, must belong to selected category)
  - Has notes (optional, text field for additional details)
  - Has same audit fields as Expense (createdAt, updatedAt, deletedAt for soft delete)
  - Inherits userId from parent expense for security filtering

- **Expense** (modified): Existing entity with relationship changes
  - Gains one-to-many relationship with ExpenseItem
  - Existing amount field represents total transaction amount
  - Category/subcategory now optional at expense level (can be derived from items if all items share same category)
  - When items exist, expense-level category may differ from item-level categories

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create an expense with 5 items in under 60 seconds
- **SC-002**: Item-level data displays in expense detail view within 500ms
- **SC-003**: Expense list view indicates itemized vs non-itemized expenses without performance degradation (list loads in under 1 second for 100 expenses)
- **SC-004**: Users can search for expenses by item name with results returned in under 1 second
- **SC-005**: Item validation errors are displayed immediately on field blur (within 200ms)
- **SC-006**: Reports can aggregate item-level data across 1000+ expenses without timeout (complete within 5 seconds)
- **SC-007**: CSV import supports at least 500 expenses with average of 3 items each, completing within 30 seconds
- **SC-008**: 95% of users successfully add items to expenses on first attempt without errors
- **SC-009**: Item editing preserves data integrity - zero data loss during updates
- **SC-010**: System supports at least 50 items per expense without UI degradation
- **SC-011**: Database queries for item-level reports execute within 2 seconds for 10,000 item records
- **SC-012**: Export functionality includes all item details and completes for 500 expenses in under 10 seconds
