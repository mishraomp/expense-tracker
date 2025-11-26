# Expense Tags Feature Specification

## Overview

Add a flexible tagging system to expenses and expense items, enabling multi-dimensional categorization and analysis without increasing hierarchy depth.

## Goals

1. **Flat taxonomy** - Tags provide cross-cutting categorization without nesting
2. **Multi-tag support** - Expenses can have multiple tags (e.g., "Work" + "Client Meeting")
3. **User-defined** - Users create and manage their own tags
4. **Optional** - Tags are not required on expenses
5. **Filterable** - Reports and lists can filter by tags
6. **Visual distinction** - Tags have optional colors for quick identification

## Use Cases

- Track spending by family member: "Ishaan", "Sukanya", "Om"
- Track by purpose: "Work", "Personal", "Gift"
- Track by event: "Birthday2025", "Vacation", "Christmas"
- Track by project: "Home Renovation", "Car Maintenance"

## Data Model

### Tags Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users(id), NOT NULL | Owner of the tag |
| name | VARCHAR(50) | NOT NULL | Tag display name |
| color_code | VARCHAR(7) | NULL | Hex color (e.g., #FF5733) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints:**
- UNIQUE(user_id, name) - Tag names unique per user

### Expense Tags Junction Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| expense_id | UUID | FK → expenses(id) ON DELETE CASCADE | Related expense |
| tag_id | UUID | FK → tags(id) ON DELETE CASCADE | Related tag |

**Constraints:**
- PRIMARY KEY (expense_id, tag_id)

### Expense Item Tags Junction Table (Optional Phase 2)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| expense_item_id | UUID | FK → expense_items(id) ON DELETE CASCADE | Related item |
| tag_id | UUID | FK → tags(id) ON DELETE CASCADE | Related tag |

**Constraints:**
- PRIMARY KEY (expense_item_id, tag_id)

## API Endpoints

### Tags CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tags | List user's tags |
| POST | /api/tags | Create new tag |
| PATCH | /api/tags/:id | Update tag (name, color) |
| DELETE | /api/tags/:id | Delete tag (cascade removes associations) |

### Tag Association

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/expenses/:id/tags | Add tags to expense |
| DELETE | /api/expenses/:id/tags/:tagId | Remove tag from expense |

### Filtering

Tags integrate into existing expense list endpoint:
- `GET /api/expenses?tagIds=uuid1,uuid2` - Filter by tags (OR logic)
- `GET /api/expenses?tagIds=uuid1,uuid2&tagMatch=all` - Filter by tags (AND logic)

## DTOs

### CreateTagDto
```typescript
{
  name: string;       // Required, max 50 chars
  colorCode?: string; // Optional, hex color
}
```

### UpdateTagDto
```typescript
{
  name?: string;
  colorCode?: string;
}
```

### TagResponseDto
```typescript
{
  id: string;
  name: string;
  colorCode: string | null;
  createdAt: string;
}
```

### ExpenseResponseDto (Updated)
```typescript
{
  // ... existing fields
  tags: TagResponseDto[];
}
```

## UI Components

### TagSelector Component

A reusable component for selecting/creating tags:

- **Dropdown** with existing tags
- **Search/filter** within dropdown
- **Create new** option when typing non-existent tag
- **Multi-select** with chip display
- **Color indicator** next to tag names

### ExpenseForm Integration

- Add TagSelector below category/subcategory
- Selected tags display as removable chips
- Tags are optional

### ExpensesTable Integration

- Add "Tags" column (or display inline with description)
- Tags display as colored badges
- Click tag to filter by that tag
- Add tag filter in filter row

### Reports Integration

- Add "By Tag" breakdown option
- Filter reports by tags
- Tag appears in line item details

## Implementation Phases

### Phase 1: Core Tags (MVP)
1. Database migration
2. Tags CRUD API
3. Tag association with expenses
4. TagSelector component
5. ExpenseForm integration
6. ExpensesTable display

### Phase 2: Enhanced Features
1. Expense item tags
2. Tag-based reports
3. Tag usage statistics
4. Bulk tag operations
5. Tag suggestions based on category

## Migration Strategy

- Tags are additive - no existing data changes
- Empty state: users start with no tags
- Optional: Seed common tags for new users

## Testing Requirements

### Backend Tests
- Tags CRUD operations
- Tag association/dissociation
- Cascade delete behavior
- User isolation (can't see others' tags)
- Expense list filtering by tags

### Frontend Tests
- TagSelector component rendering
- Tag creation flow
- Tag selection/deselection
- ExpenseForm with tags
- Tag display in table

## Performance Considerations

- Index on tags(user_id) for list queries
- Index on expense_tags(expense_id) for joins
- Index on expense_tags(tag_id) for tag deletion
- Limit tags per expense (soft limit: 10)
- Pagination for tag list if > 100 tags

## Security

- Tags are user-scoped (can't access other users' tags)
- Tag IDs validated against current user
- SQL injection prevention via Prisma parameterization
