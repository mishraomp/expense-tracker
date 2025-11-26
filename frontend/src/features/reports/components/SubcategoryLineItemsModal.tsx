import { useSubcategoryLineItems } from '../hooks/useReports';
import type { SubcategoryBreakdownItem } from '../types/reports.types';
import Decimal from 'decimal.js';

interface Props {
  isOpen: boolean;
  subcategory: SubcategoryBreakdownItem | null;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

export const SubcategoryLineItemsModal = ({
  isOpen,
  subcategory,
  startDate,
  endDate,
  onClose,
}: Props) => {
  const query = useSubcategoryLineItems({
    subcategoryId: subcategory?.subcategoryId || '',
    startDate,
    endDate,
  });

  if (!isOpen || !subcategory) return null;

  return (
    <div
      className="modal modal-slide show d-block modal-backdrop-custom"
      aria-modal="true"
      role="dialog"
      aria-labelledby="subcategoryLineItemsLabel"
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="subcategoryLineItemsLabel">
              <span
                className="badge me-2"
                style={{ backgroundColor: subcategory.colorCode || '#6c757d' }}
              >
                &nbsp;
              </span>
              {subcategory.subcategoryName}
              <small className="text-muted ms-2">({subcategory.categoryName})</small>
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            {query.isLoading && (
              <div className="d-flex justify-content-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {query.isError && (
              <div className="alert alert-danger" role="alert">
                Error loading line items: {query.error?.message || 'Unknown error'}
              </div>
            )}
            {query.isSuccess && query.data.items.length === 0 && (
              <div className="alert alert-info" role="alert">
                No line items found for this subcategory. Line items are only shown when expenses
                have been itemized with specific subcategories.
              </div>
            )}
            {query.isSuccess && query.data.items.length > 0 && (
              <>
                <div className="alert alert-light mb-3">
                  <strong>Total:</strong>{' '}
                  <span className="text-success fw-bold">
                    ${new Decimal(query.data.total).toFixed(2)}
                  </span>
                  <span className="text-muted ms-2">
                    ({query.data.items.length} line item
                    {query.data.items.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Item Name</th>
                        <th className="text-end">Amount</th>
                        <th>From Expense</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.items.map((item) => (
                        <tr key={item.id}>
                          <td className="text-nowrap">{item.expenseDate}</td>
                          <td className="fw-medium">{item.name}</td>
                          <td className="text-end text-nowrap">
                            ${new Decimal(item.amount).toFixed(2)}
                          </td>
                          <td className="text-muted small">
                            {item.expenseDescription || '(No description)'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <span className="text-muted small me-auto">
              Date range: {startDate} to {endDate}
            </span>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
