import ExpenseFormModal from '../components/ExpenseFormModal';
import ExpensesTable from '../components/ExpensesTable';
import ExpenseFilters from '../components/ExpenseFilters';
import CategorySummary from '../components/CategorySummary';
import { useState } from 'react';
import type { ExpenseListQuery } from '../types/expense.types';
import type { Expense } from '../types/expense.types';

export default function ExpensesPage() {
  const [filters, setFilters] = useState<Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'>>(
    {},
  );
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const hasAnyFilterSelected = Boolean(
    filters.categoryId ||
      filters.subcategoryId ||
      filters.startDate ||
      filters.endDate ||
      filters.filterYear ||
      filters.filterMonth,
  );

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

      <ExpenseFilters value={filters} onChange={setFilters} />

      <CategorySummary filters={filters} />

      <div className="row g-2">
        <div className="col-12">
          <ExpensesTable onEdit={handleEdit} filters={filters} onFilterChange={setFilters} />
        </div>
      </div>

      <ExpenseFormModal
        isOpen={isFormOpen}
        expense={editingExpense}
        onClose={handleCloseForm}
        onSaved={handleExpenseSaved}
      />
    </div>
  );
}
