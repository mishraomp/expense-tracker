# API Contracts: GST/PST Tax Feature (Checkbox-based with Database Defaults)

**Date**: 2025-12-14  
**Status**: Design Phase 1  
**Spec**: [spec.md](../spec.md) | **Data Model**: [data-model.md](../data-model.md)

---

## Overview

API contracts for adding GST and PST tax tracking using **checkbox-based applicability flags**. Requests include boolean `gstApplicable` and `pstApplicable` flags; responses include system-computed tax amounts. No manual rate entry in Phase 1.

---

## Resource: Expenses

### POST /expenses - Create Expense with Optional Taxes

**Description**: Create a new expense, optionally applying system default GST/PST rates via checkboxes.

**Request**:
```json
{
  "date": "2025-12-14",
  "description": "Office supplies",
  "amount": 100.00,
  "categoryId": 5,
  "gstApplicable": true,
  "pstApplicable": true,
  "notes": "Quarterly supplies"
}
```

**Request Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `date` | ISO 8601 string | Yes | Expense date. |
| `description` | string(255) | Yes | Expense description. |
| `amount` | decimal | Yes | Expense subtotal (before taxes). |
| `categoryId` | integer | Yes | Category ID. |
| `gstApplicable` | boolean | No | Default: false. Apply system default GST rate? |
| `pstApplicable` | boolean | No | Default: false. Apply system default PST rate? |
| `notes` | string(1000) | No | Optional notes. |

**Response** (201 Created):
```json
{
  "id": 42,
  "date": "2025-12-14",
  "description": "Office supplies",
  "subtotal": 100.00,
  "gstApplicable": true,
  "gstRate": 5.00,
  "gstAmount": 5.00,
  "pstApplicable": true,
  "pstRate": 7.00,
  "pstAmount": 7.00,
  "totalTaxAmount": 12.00,
  "total": 112.00,
  "categoryId": 5,
  "category": {
    "id": 5,
    "name": "Office Supplies"
  },
  "userId": "user-uuid-123",
  "notes": "Quarterly supplies",
  "createdAt": "2025-12-14T10:00:00Z",
  "updatedAt": "2025-12-14T10:00:00Z"
}
```

**Response Fields**:
| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | Expense ID. |
| `subtotal` | decimal | Original amount (before taxes). |
| `gstApplicable` | boolean | GST flag (echoed from request). |
| `gstRate` | decimal/null | System default GST rate (5.00 = 5%), null if not applicable. |
| `gstAmount` | decimal | Computed GST (subtotal * gstRate / 100). |
| `pstApplicable` | boolean | PST flag (echoed from request). |
| `pstRate` | decimal/null | System default PST rate (7.00 = 7%), null if not applicable. |
| `pstAmount` | decimal | Computed PST (subtotal * pstRate / 100). |
| `totalTaxAmount` | decimal | gstAmount + pstAmount. |
| `total` | decimal | subtotal + gstAmount + pstAmount (rounded to 2 decimals). |
| All other fields | - | Unchanged. |

**Validation**:
- `amount` must be >= 0.
- `gstApplicable`, `pstApplicable` must be boolean (false if omitted).
- Tax amounts computed automatically; no manual entry allowed.

---

### GET /expenses/:id - Retrieve Expense with Tax Details

**Response** (200 OK):
```json
{
  "id": 42,
  "date": "2025-12-14",
  "description": "Office supplies",
  "subtotal": 100.00,
  "gstApplicable": true,
  "gstRate": 5.00,
  "gstAmount": 5.00,
  "pstApplicable": true,
  "pstRate": 7.00,
  "pstAmount": 7.00,
  "totalTaxAmount": 12.00,
  "total": 112.00,
  "categoryId": 5,
  "category": {
    "id": 5,
    "name": "Office Supplies"
  },
  "userId": "user-uuid-123",
  "items": [
    {
      "id": 201,
      "description": "Pens (pack of 50)",
      "subtotal": 20.00,
      "gstApplicable": true,
      "gstAmount": 1.00,
      "pstApplicable": true,
      "pstAmount": 1.40,
      "total": 22.40
    },
    {
      "id": 202,
      "description": "Paper (500 sheets)",
      "subtotal": 80.00,
      "gstApplicable": true,
      "gstAmount": 4.00,
      "pstApplicable": true,
      "pstAmount": 5.60,
      "total": 89.60
    }
  ],
  "createdAt": "2025-12-14T10:00:00Z",
  "updatedAt": "2025-12-14T10:00:00Z"
}
```

**Notes**:
- If expense has line items, expense-level `gstAmount` and `pstAmount` are **sum of line amounts**.
- Expense-level flags may be ignored if lines are present.

---

### PUT /expenses/:id - Update Expense (Including Tax Flags)

**Request**:
```json
{
  "description": "Office supplies (updated)",
  "amount": 120.00,
  "gstApplicable": false,
  "pstApplicable": true
}
```

**Response** (200 OK):
```json
{
  "id": 42,
  "date": "2025-12-14",
  "description": "Office supplies (updated)",
  "subtotal": 120.00,
  "gstApplicable": false,
  "gstRate": null,
  "gstAmount": 0,
  "pstApplicable": true,
  "pstRate": 7.00,
  "pstAmount": 8.40,
  "totalTaxAmount": 8.40,
  "total": 128.40,
  "categoryId": 5,
  "userId": "user-uuid-123",
  "createdAt": "2025-12-14T10:00:00Z",
  "updatedAt": "2025-12-14T10:30:00Z"
}
```

**Validation**:
- Only the fields provided are updated.
- Tax amounts recomputed when flags or amount change.

---

### DELETE /expenses/:id

**Response** (204 No Content)  
Deletes expense and all associated line items.

#### Example Request

```
GET /api/expenses?skip=0&take=10&withTax=true
```
---

## Resource: Expense Items (Line Items)

### POST /expenses/:id/items - Create Line Item with Optional Taxes

**Description**: Add a line item to an expense, optionally applying taxes independently.

**Request**:
```json
{
  "description": "Laptop",
  "amount": 1200.00,
  "gstApplicable": true,
  "pstApplicable": false
}
```

**Request Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `description` | string(255) | Yes | Line item description. |
| `amount` | decimal | Yes | Line item subtotal (before taxes). |
| `gstApplicable` | boolean | No | Default: false. Apply system default GST rate? |
| `pstApplicable` | boolean | No | Default: false. Apply system default PST rate? |

**Response** (201 Created):
```json
{
  "id": 201,
  "expenseId": 42,
  "description": "Laptop",
  "subtotal": 1200.00,
  "gstApplicable": true,
  "gstRate": 5.00,
  "gstAmount": 60.00,
  "pstApplicable": false,
  "pstRate": null,
  "pstAmount": 0,
  "totalTaxAmount": 60.00,
  "total": 1260.00,
  "createdAt": "2025-12-14T10:05:00Z",
  "updatedAt": "2025-12-14T10:05:00Z"
}
```

**Side Effects**:
- Parent expense's `gstAmount` and `pstAmount` updated (sum of all line amounts).
- Parent expense `total` recalculated.

---

### GET /expenses/:id/items - List Line Items for Expense

**Response** (200 OK):
```json
[
  {
    "id": 201,
    "description": "Pens (pack of 50)",
    "subtotal": 20.00,
    "gstApplicable": true,
    "gstAmount": 1.00,
    "pstApplicable": true,
    "pstAmount": 1.40,
    "total": 22.40
  },
  {
    "id": 202,
    "description": "Paper (500 sheets)",
    "subtotal": 80.00,
    "gstApplicable": true,
    "gstAmount": 4.00,
    "pstApplicable": true,
    "pstAmount": 5.60,
    "total": 89.60
  }
]
```

---

### PUT /expenses/:id/items/:itemId - Update Line Item

**Request**:
```json
{
  "description": "Pens (pack of 100)",
  "amount": 40.00,
  "gstApplicable": false
}
```

**Response** (200 OK):
```json
{
  "id": 201,
  "expenseId": 42,
  "description": "Pens (pack of 100)",
  "subtotal": 40.00,
  "gstApplicable": false,
  "gstAmount": 0,
  "pstApplicable": true,
  "pstAmount": 2.80,
  "total": 42.80,
  "updatedAt": "2025-12-14T10:10:00Z"
}
```

**Side Effects**:
- Parent expense totals recalculated.

---

### DELETE /expenses/:id/items/:itemId

**Response** (204 No Content)  
Deletes line item; parent expense totals recalculated.

---

## Expense Without Taxes (Tax-Exempt)

### Request:
```json
{
  "date": "2025-12-14",
  "description": "Personal meal",
  "amount": 50.00,
  "categoryId": 10
}
```

### Response:
```json
{
  "id": 99,
  "date": "2025-12-14",
  "description": "Personal meal",
  "subtotal": 50.00,
  "gstApplicable": false,
  "gstRate": null,
  "gstAmount": 0,
  "pstApplicable": false,
  "pstRate": null,
  "pstAmount": 0,
  "totalTaxAmount": 0,
  "total": 50.00,
  "categoryId": 10,
  "userId": "user-uuid-123",
  "createdAt": "2025-12-14T11:00:00Z"
}
```

---

## Refund (Negative Amount)

### Request:
```json
{
  "date": "2025-12-14",
  "description": "Refund - defective laptop",
  "amount": -1200.00,
  "gstApplicable": true,
  "pstApplicable": true
}
```

### Response:
```json
{
  "id": 100,
  "date": "2025-12-14",
  "description": "Refund - defective laptop",
  "subtotal": -1200.00,
  "gstApplicable": true,
  "gstRate": 5.00,
  "gstAmount": -60.00,
  "pstApplicable": true,
  "pstRate": 7.00,
  "pstAmount": -84.00,
  "totalTaxAmount": -144.00,
  "total": -1344.00,
  "createdAt": "2025-12-14T11:05:00Z"
}
```

---

## Error Responses

### 400 Bad Request - Invalid Tax Flags

**Request**:
```json
{
  "amount": 100,
  "gstApplicable": "yes"
}
```

**Response**:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "gstApplicable",
      "message": "gstApplicable must be a boolean"
    }
  ]
}
```

### 404 Not Found

**Response**:
```json
{
  "statusCode": 404,
  "message": "Expense with ID 9999 not found"
}
```

### 500 Internal Server Error - Tax Calculation Failure

**Response**:
```json
{
  "statusCode": 500,
  "message": "Failed to calculate taxes: system default rates unavailable",
  "details": "TaxDefaults lookup failed"
}
```

---

## Implementation Notes

1. **Automatic Calculation**: Tax amounts are always computed server-side; clients cannot override them.
2. **Default Rates**: System defaults (GST 5%, PST 7% for Canada) are applied when flags are true.
3. **Flags vs. Rates**: API uses boolean flags only (no `gstRate`/`pstRate` input fields). Rates are system config.
4. **Line Aggregation**: Expense-level tax amounts = sum of line amounts (if lines exist).
5. **Rounding**: Final total rounded to 2 decimals; intermediate line amounts kept exact for aggregation accuracy.
6. **CSV Export**: Includes `gstApplicable`, `pstApplicable`, `gstAmount`, `pstAmount` columns.

