import type { CreateExpenseItemInput } from '../types/expense-item.types';
import type { Category } from '../types/expense.types';

interface ExpenseItemListProps {
  /** List of items to display */
  items: CreateExpenseItemInput[];
  /** Available categories for displaying names */
  categories: Category[];
  /** Called when an item is removed */
  onRemoveItem: (index: number) => void;
  /** Whether list is disabled */
  disabled?: boolean;
}

/**
 * Display list of expense items with ability to remove.
 * Used in ExpenseForm to show items before saving.
 */
export default function ExpenseItemList({
  items,
  categories,
  onRemoveItem,
  disabled = false,
}: ExpenseItemListProps) {
  if (items.length === 0) {
    return null;
  }

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Parent';
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="mt-2">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-muted fw-semibold">Items ({items.length})</small>
        <small className="text-muted">
          Total: <strong>${totalAmount.toFixed(2)}</strong>
        </small>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-borderless mb-0 expense-item-table">
          <thead className="table-light">
            <tr>
              <th className="col-name">Name</th>
              <th className="col-amount text-end">Amount</th>
              <th className="col-category">Category</th>
              <th className="col-notes">Notes</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="text-truncate cell-truncate-md" title={item.name}>
                  {item.name}
                </td>
                <td className="text-end">${item.amount.toFixed(2)}</td>
                <td className="text-truncate cell-truncate-sm">
                  {getCategoryName(item.categoryId)}
                </td>
                <td
                  className="text-truncate text-muted small cell-truncate-md"
                  title={item.notes || ''}
                >
                  {item.notes || '-'}
                </td>
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-danger p-0"
                    onClick={() => onRemoveItem(index)}
                    disabled={disabled}
                    title="Remove item"
                  >
                    <i className="bi bi-x-circle"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
