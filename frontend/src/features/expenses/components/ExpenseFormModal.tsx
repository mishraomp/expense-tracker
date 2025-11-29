import { createPortal } from 'react-dom';
import ExpenseForm from './ExpenseForm';
import type { Expense } from '../types/expense.types';

interface ExpenseFormModalProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ExpenseFormModal({
  isOpen,
  expense,
  onClose,
  onSaved,
}: ExpenseFormModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal show d-block z-modal" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-scrollable-viewport" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{expense ? 'Edit Expense' : 'Add New Expense'}</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <ExpenseForm expense={expense || undefined} onSuccess={onSaved} onCancel={onClose} />
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show z-modal-backdrop"></div>
    </>,
    document.body,
  );
}
