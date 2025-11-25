import { useState } from 'react';
import type { ExpenseItem, CreateExpenseItemInput } from '../types/expense-item.types';
import type { Category } from '../types/expense.types';
import { useExpenseItems, useCreateExpenseItem } from '../api/expenseItemApi';
import ExpenseItemEditRow from './ExpenseItemEditRow';
import ExpenseItemForm from './ExpenseItemForm';

interface ExpenseItemsManagerProps {
  expenseId: string;
  categories: Category[];
  defaultCategoryId?: string;
  defaultSubcategoryId?: string;
}

/**
 * Component for managing expense items in edit mode.
 * Displays existing items with inline edit capability and add new item form.
 */
export default function ExpenseItemsManager({
  expenseId,
  categories,
  defaultCategoryId,
  defaultSubcategoryId,
}: ExpenseItemsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { data: itemsData, isLoading, refetch } = useExpenseItems(expenseId);
  const createItem = useCreateExpenseItem();

  const items = itemsData?.data || [];
  const totalAmount = itemsData?.summary?.totalAmount || 0;

  const handleAddItem = async (item: CreateExpenseItemInput) => {
    await createItem.mutateAsync({ expenseId, data: item });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading items...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-top">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">
          Line Items{' '}
          {items.length > 0 && <span className="badge bg-secondary ms-1">{items.length}</span>}
        </h6>
        {items.length > 0 && (
          <small className="text-muted">
            Total: <strong>${totalAmount.toFixed(2)}</strong>
          </small>
        )}
      </div>

      {items.length > 0 && (
        <div className="table-responsive mb-2">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '30%' }}>Name</th>
                <th style={{ width: '15%' }} className="text-end">
                  Amount
                </th>
                <th style={{ width: '20%' }}>Category</th>
                <th style={{ width: '25%' }}>Notes</th>
                <th style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: ExpenseItem) => (
                <ExpenseItemEditRow
                  key={item.id}
                  item={item}
                  expenseId={expenseId}
                  categories={categories}
                  onUpdated={() => refetch()}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && !showAddForm && (
        <div className="text-center text-muted py-3">
          <p className="mb-2">No line items yet.</p>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowAddForm(true)}
          >
            <i className="bi bi-plus-lg me-1"></i>Add Item
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="mb-2">
          <ExpenseItemForm
            categories={categories}
            onAddItem={(item) => {
              handleAddItem(item);
              // Keep form open for adding more items
            }}
            disabled={createItem.isPending}
            defaultCategoryId={defaultCategoryId}
            defaultSubcategoryId={defaultSubcategoryId}
          />
          <div className="mt-1 text-end">
            <button
              type="button"
              className="btn btn-link btn-sm text-muted"
              onClick={() => setShowAddForm(false)}
            >
              Done adding items
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && !showAddForm && (
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => setShowAddForm(true)}
        >
          <i className="bi bi-plus-lg me-1"></i>Add Item
        </button>
      )}
    </div>
  );
}
