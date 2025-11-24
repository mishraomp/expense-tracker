import type { Expense } from '../types/expense.types';
import { toYYYYMMDD } from '@/services/date';
import { useState } from 'react';
import ManageAttachmentsModal from '../../attachments/ManageAttachmentsModal';

interface ExpenseListItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseListItem({ expense, onEdit, onDelete }: ExpenseListItemProps) {
  const [showAttachments, setShowAttachments] = useState(false);
  const handleDelete = () => {
    // Trigger parent to open confirm modal
    onDelete(expense.id);
  };

  const formatDate = (dateString: string) => toYYYYMMDD(dateString);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <tr>
      <td>{formatDate(expense.date)}</td>
      <td>{formatAmount(expense.amount)}</td>
      <td>
        {expense.category && (
          <div className="d-flex flex-column">
            <span
              className="badge mb-1"
              style={{ backgroundColor: expense.category.colorCode || '#6c757d', color: '#fff' }}
            >
              {expense.category.name}
            </span>
            {expense.subcategory && (
              <small className="text-muted">{expense.subcategory.name}</small>
            )}
          </div>
        )}
      </td>
      <td className="text-truncate" style={{ maxWidth: '18.75rem' }}>
        {expense.description || <em className="text-muted">No description</em>}
      </td>
      <td>
        <div className="btn-group btn-group-sm" role="group" aria-label="Expense actions">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => onEdit(expense)}
            aria-label={`Edit expense from ${formatDate(expense.date)}`}
          >
            <i className="bi bi-pencil"></i> Edit
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => setShowAttachments(true)}
            aria-label={`Manage attachments for expense from ${formatDate(expense.date)}`}
          >
            <i className="bi bi-paperclip me-1" aria-hidden="true"></i>
            Attachments
            {typeof expense.attachmentCount === 'number' && (
              <span className="badge bg-secondary ms-1" aria-label="Attachment count">
                {expense.attachmentCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={handleDelete}
            aria-label={`Delete expense from ${formatDate(expense.date)}`}
          >
            <i className="bi bi-trash"></i> Delete
          </button>
        </div>
        {showAttachments && (
          <ManageAttachmentsModal
            recordType="expense"
            recordId={expense.id}
            isOpen={showAttachments}
            onClose={() => setShowAttachments(false)}
          />
        )}
      </td>
    </tr>
  );
}
