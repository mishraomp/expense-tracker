# Feature Specification: Separate Budget Entity

**Feature Branch**: `001-separate-budget-entity`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "Refactor and update the application: update the data model to make Budget a separate entity with a budget period and referenced from Category and Subcategory, while ensuring all existing views/materialized views and backend/frontend functionality continue to work the same."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No user-visible regressions (Priority: P1)

As a user, I can view and manage budgets for categories and subcategories and see the same values and outcomes as before, even though the internal model is refactored.

**Why this priority**: This change is primarily a data-model refactor; preserving current behavior prevents regressions in core budgeting and reporting workflows.

**Independent Test**: Can be fully tested by opening all existing budget and report screens on a known dataset and confirming the displayed budgets and totals match the baseline.

**Acceptance Scenarios**:

1. **Given** an existing dataset with categories, subcategories, and budgets, **When** the user opens the existing budget-related screens, **Then** the same budgets are shown with the same amounts and period grouping as before.
2. **Given** an existing dataset and existing report screens that depend on budget data, **When** the user loads each report, **Then** the report loads successfully and shows the same totals as before.

---

### User Story 2 - Budget period is explicit (Priority: P2)

As a user, a budget has an explicit period so it is unambiguous which time range the budget applies to.

**Why this priority**: Making period explicit reduces ambiguity and ensures consistent calculations across the application.

**Independent Test**: Can be fully tested by creating or editing a budget and verifying it is correctly scoped to the intended period across the existing UI and reports.

**Acceptance Scenarios**:

1. **Given** a user creates or edits a budget through the existing workflow, **When** they define the budget period, **Then** the budget is saved and appears in the same places it appeared before for that time range.
2. **Given** budgets exist for multiple distinct periods, **When** the user navigates between periods using existing navigation controls, **Then** budgets shown for each period are consistent and correct.

---

### User Story 3 - Category and subcategory budgeting remains consistent (Priority: P3)

As a user, budgets apply to categories and/or subcategories in a way that matches current behavior, while making the relationship explicit for clarity and maintainability.

**Why this priority**: This clarifies how budgets relate to the category hierarchy without changing the user experience.

**Independent Test**: Can be fully tested by verifying that category-level and subcategory-level budgets show up where expected in existing UI and reports.

**Acceptance Scenarios**:

1. **Given** a budget applies to a category for a period, **When** the user views that category's budget context, **Then** the budget appears as it did before.
2. **Given** a budget applies to a subcategory for a period, **When** the user views that subcategory's budget context, **Then** the budget appears as it did before.

---

### Edge Cases

- Multiple budgets overlap the same category/subcategory and period.
- A category or subcategory is removed/archived while budgets still reference it.
- A budget is created with an invalid period (e.g., end date before start date).
- Budgets exist for categories/subcategories with no expenses, or expenses exist without any budgets.
- Reports are accessed while derived/reporting data is being refreshed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST treat Budget as a distinct business entity.
- **FR-002**: System MUST store an explicit budget period for each budget.
- **FR-003**: System MUST support associating budgets to categories and subcategories in a way that preserves existing user-visible behavior.
- **FR-004**: System MUST preserve existing budgeting screens and workflows (create, edit, view) without user-visible breaking changes.
- **FR-005**: System MUST preserve existing reporting behavior that depends on budgets, including derived/aggregated reporting outputs.
- **FR-006**: System MUST migrate existing budget data to the new model with no data loss.
- **FR-007**: System MUST ensure existing reporting views and materialized/derived reporting datasets continue to return expected results.
- **FR-008**: System MUST reject budgets with invalid periods (e.g., end date earlier than start date).
- **FR-009**: System MUST define deterministic behavior for overlapping budgets for the same category/subcategory and period.

Overlapping budget rule (default):

- For any given category/subcategory and period, the most recently updated budget is treated as the active budget in user-facing calculations, and other overlapping budgets are not used for totals.

### Key Entities *(include if feature involves data)*

- **Budget**: A planned amount for a specific period, used in budgeting and reports.
  - Key attributes: amount, period, association to a category and/or subcategory.
- **Budget Period**: The time window a budget applies to.
  - Key attributes: start date, end date (or another explicit period representation used in the product).
- **Category**: High-level classification for transactions.
  - Relationship: can reference budgets for one or more periods.
- **Subcategory**: Classification under a category.
  - Relationship: can reference budgets for one or more periods.

### Assumptions

- Existing user workflows and UI affordances remain unchanged; only underlying data organization changes.
- A budget period can be represented explicitly in a way sufficient to reproduce current behavior.
- Budget calculations used by existing reports continue to use the same definitions for "budgeted", "spent", and "remaining" as they do today.

### Dependencies

- Existing reporting views/materialized views and other derived reporting outputs continue to produce the same results for the same dataset.
- Any existing import/export that includes budget data continues to work with equivalent outcomes.
- Any automated refresh/rebuild processes for derived reporting data continue to run successfully.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing budget-related screens load successfully and display the same values as the pre-change baseline dataset.
- **SC-002**: All existing report screens that depend on budgets load successfully and display the same totals as the pre-change baseline dataset.
- **SC-003**: Migration preserves budget data with 0 lost budgets when comparing counts and total budgeted amounts by equivalent period/category/subcategory.
- **SC-004**: Users can create and save a budget with a period via the existing workflow with at least a 95% successful completion rate in smoke testing.
