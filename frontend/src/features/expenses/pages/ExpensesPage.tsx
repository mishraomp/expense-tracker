import ExpenseFormModal from '../components/ExpenseFormModal';
import ExpensesTable from '../components/ExpensesTable';
import { useState, useMemo } from 'react';
import type { ExpenseListQuery } from '../types/expense.types';
import type { Expense } from '../types/expense.types';

// Helper to get current month start date (YYYY-MM-01)
function getCurrentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// Helper to get today's date (YYYY-MM-DD)
function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function ExpensesPage() {
  // Initialize filters with current month date range
  const defaultFilters = useMemo(
    () => ({
      startDate: getCurrentMonthStart(),
      endDate: getToday(),
    }),
    [],
  );

  const [filters, setFilters] =
    useState<Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'>>(defaultFilters);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleExpenseSaved = () => {
    setEditingExpense(null);
    setIsFormOpen(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingExpense(null);
    setIsFormOpen(false);
  };

  return (
    <div className="py-2">
      <div className="row align-items-center mb-3">
        <div className="col">
          <h1 className="h3 mb-1">Expense Tracker</h1>
          <p className="text-muted small mb-0">Manage your expenses and track your spending</p>
        </div>
        <div className="col-auto">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingExpense(null);
              setIsFormOpen(true);
            }}
          >
            Add Expense
          </button>
        </div>
      </div>

      <ExpensesTable onEdit={handleEdit} filters={filters} onFilterChange={setFilters} />

      <ExpenseFormModal
        isOpen={isFormOpen}
        expense={editingExpense}
        onClose={handleCloseForm}
        onSaved={handleExpenseSaved}
      />
    </div>
  );
}
