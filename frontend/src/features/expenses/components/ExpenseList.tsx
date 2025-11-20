import { useState } from 'react';
import { useExpenses } from '../api/expenseApi';
import type { ExpenseListQuery, Expense } from '../types/expense.types';
import ExpenseListItem from './ExpenseListItem';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useDeleteExpense } from '../api/expenseApi';

interface ExpenseListProps {
  filters?: Omit<ExpenseListQuery, 'page' | 'pageSize'>;
  onEdit?: (expense: Expense) => void;
}

export default function ExpenseList({ filters = {}, onEdit }: ExpenseListProps) {
  const [page, setPage] = useState(1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const { data, isLoading, error } = useExpenses({ ...filters, page, pageSize: 20 });
  const deleteExpense = useDeleteExpense();

  const handleEdit = (expense: Expense) => {
    onEdit?.(expense);
  };

  const handleDeleteClick = (id: string) => {
    const expense = data?.data.find((e) => e.id === id);
    if (expense) {
      setExpenseToDelete(expense);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (expenseToDelete) {
      await deleteExpense.mutateAsync(expenseToDelete.id);
      setDeleteModalOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setExpenseToDelete(null);
  };

  // handleKeyDown was removed because it was not used; keyboard handling is implemented on interactive elements

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading expenses...</span>
          </div>
          <p className="mt-3 mb-0">Loading expenses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            <h5 className="alert-heading">Error Loading Expenses</h5>
            <p className="mb-0">{(error as Error).message || 'Failed to load expenses'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <h5 className="text-muted">No expenses found</h5>
          <p className="text-muted">Start by adding your first expense above.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-header py-2">
          <h6 className="mb-0">
            Expenses
            <span className="badge bg-secondary ms-2">{data.pagination.total}</span>
          </h6>
        </div>
        <div className="card-body p-2">
          <div className="table-responsive">
            <table className="table table-hover" aria-label="Expense list">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Category</th>
                  <th scope="col">Description</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((expense) => (
                  <ExpenseListItem
                    key={expense.id}
                    expense={expense}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <nav aria-label="Expense list pagination">
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                </li>
                {[...Array(data.pagination.totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(i + 1)}
                      aria-label={`Page ${i + 1}`}
                      aria-current={page === i + 1 ? 'page' : undefined}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item ${page === data.pagination.totalPages ? 'disabled' : ''}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.pagination.totalPages}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        expenseAmount={expenseToDelete?.amount || 0}
        expenseDate={expenseToDelete?.date || ''}
      />
    </>
  );
}
