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
  const totalGST = items.reduce((sum, item) => {
    return sum + (item.gstApplicable ? item.amount * 0.05 : 0);
  }, 0);
  const totalPST = items.reduce((sum, item) => {
    return sum + (item.pstApplicable ? item.amount * 0.07 : 0);
  }, 0);
  const totalTax = totalGST + totalPST;
  const totalWithTax = totalAmount + totalTax;

  return (
    <div className="mt-2">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-muted fw-semibold">Items ({items.length})</small>
        <div className="text-end">
          {totalTax > 0 && (
            <small className="text-muted d-block">
              Subtotal: <strong>${totalAmount.toFixed(2)}</strong> + Tax:{' '}
              <strong>${totalTax.toFixed(2)}</strong>
            </small>
          )}
          <small className={totalTax > 0 ? 'text-success fw-semibold' : 'text-muted'}>
            Total: <strong>${(totalTax > 0 ? totalWithTax : totalAmount).toFixed(2)}</strong>
          </small>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-borderless mb-0 expense-item-table">
          <thead className="table-light">
            <tr>
              <th className="col-name">Name</th>
              <th className="col-amount text-end">Amount</th>
              <th className="col-tax text-end">Tax</th>
              <th className="col-total text-end">Total</th>
              <th className="col-category">Category</th>
              <th className="col-notes">Notes</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const itemGST = item.gstApplicable ? item.amount * 0.05 : 0;
              const itemPST = item.pstApplicable ? item.amount * 0.07 : 0;
              const itemTax = itemGST + itemPST;
              const itemTotal = item.amount + itemTax;

              return (
                <tr key={index}>
                  <td className="text-truncate cell-truncate-md" title={item.name}>
                    {item.name}
                  </td>
                  <td className="text-end">${item.amount.toFixed(2)}</td>
                  <td className="text-end small">
                    {itemTax > 0 ? (
                      <span className="text-success fw-semibold">${itemTax.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="text-end">
                    {itemTax > 0 ? (
                      <span className="text-success fw-bold">${itemTotal.toFixed(2)}</span>
                    ) : (
                      <span>${item.amount.toFixed(2)}</span>
                    )}
                  </td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
