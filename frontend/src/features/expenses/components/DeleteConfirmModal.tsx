import { createPortal } from 'react-dom';
import { toYYYYMMDD } from '@/services/date';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  expenseAmount: number;
  expenseDate: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  expenseAmount,
  expenseDate,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => toYYYYMMDD(dateString);

  return createPortal(
    <>
      <div
        className="modal show d-block z-modal"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="deleteModalLabel"
        aria-modal="true"
      >
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="deleteModalLabel">
                Confirm Delete
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onCancel}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this expense?</p>
              <div className="alert alert-warning">
                <strong>{formatAmount(expenseAmount)}</strong> on{' '}
                <strong>{formatDate(expenseDate)}</strong>
              </div>
              <p className="text-muted mb-0">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={onConfirm} autoFocus>
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show z-modal-backdrop"></div>
    </>,
    document.body,
  );
}
