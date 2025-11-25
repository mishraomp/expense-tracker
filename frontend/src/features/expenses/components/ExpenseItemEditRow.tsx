import { useState } from 'react';
import type { ExpenseItem } from '../types/expense-item.types';
import type { Category } from '../types/expense.types';
import { useUpdateExpenseItem, useDeleteExpenseItem } from '../api/expenseItemApi';
import SubcategorySelector from '../../subcategories/components/SubcategorySelector';

interface ExpenseItemEditRowProps {
  item: ExpenseItem;
  expenseId: string;
  categories: Category[];
  onUpdated?: () => void;
}

/**
 * Inline editable row for an existing expense item.
 * Shows in display mode by default, switches to edit mode on click.
 */
export default function ExpenseItemEditRow({
  item,
  expenseId,
  categories,
  onUpdated,
}: ExpenseItemEditRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editAmount, setEditAmount] = useState(item.amount.toString());
  const [editCategoryId, setEditCategoryId] = useState(item.categoryId || '');
  const [editSubcategoryId, setEditSubcategoryId] = useState(item.subcategoryId || '');
  const [editNotes, setEditNotes] = useState(item.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateMutation = useUpdateExpenseItem();
  const deleteMutation = useDeleteExpenseItem();

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Parent';
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      expenseId,
      itemId: item.id,
      data: {
        name: editName.trim(),
        amount: parseFloat(editAmount),
        categoryId: editCategoryId || null,
        subcategoryId: editSubcategoryId || null,
        notes: editNotes.trim() || null,
      },
    });
    setIsEditing(false);
    onUpdated?.();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ expenseId, itemId: item.id });
    setShowDeleteConfirm(false);
    onUpdated?.();
  };

  const handleCancel = () => {
    setEditName(item.name);
    setEditAmount(item.amount.toString());
    setEditCategoryId(item.categoryId || '');
    setEditSubcategoryId(item.subcategoryId || '');
    setEditNotes(item.notes || '');
    setIsEditing(false);
  };

  const isLoading = updateMutation.isPending || deleteMutation.isPending;

  // Delete confirmation dialog
  if (showDeleteConfirm) {
    return (
      <tr className="table-warning">
        <td colSpan={5} className="p-2">
          <div className="d-flex align-items-center justify-content-between">
            <span>Delete "{item.name}"?</span>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  // Edit mode
  if (isEditing) {
    return (
      <tr>
        <td>
          <input
            type="text"
            className="form-control form-control-sm"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={isLoading}
          />
        </td>
        <td>
          <div className="input-group input-group-sm">
            <span className="input-group-text">$</span>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </td>
        <td>
          <select
            className="form-select form-select-sm"
            value={editCategoryId}
            onChange={(e) => {
              setEditCategoryId(e.target.value);
              setEditSubcategoryId('');
            }}
            disabled={isLoading}
          >
            <option value="">Parent</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </td>
        <td>
          <SubcategorySelector
            categoryId={editCategoryId || undefined}
            value={editSubcategoryId}
            onChange={(val) => setEditSubcategoryId(val)}
            disabled={isLoading}
            size="sm"
            hideLabel={true}
            placeholder="Parent"
          />
        </td>
        <td className="text-end">
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className="btn btn-success"
              onClick={handleSave}
              disabled={isLoading || !editName.trim() || !editAmount}
              title="Save"
            >
              <i className="bi bi-check"></i>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={isLoading}
              title="Cancel"
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // Display mode
  return (
    <tr
      className="cursor-pointer"
      onClick={() => setIsEditing(true)}
      style={{ cursor: 'pointer' }}
      title="Click to edit"
    >
      <td className="text-truncate" style={{ maxWidth: '150px' }} title={item.name}>
        {item.name}
      </td>
      <td className="text-end">${item.amount.toFixed(2)}</td>
      <td className="text-truncate" style={{ maxWidth: '100px' }}>
        {getCategoryName(item.categoryId)}
      </td>
      <td
        className="text-truncate text-muted small"
        style={{ maxWidth: '150px' }}
        title={item.notes || ''}
      >
        {item.notes || '-'}
      </td>
      <td className="text-end">
        <button
          type="button"
          className="btn btn-link btn-sm text-danger p-0"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          title="Delete item"
        >
          <i className="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  );
}
