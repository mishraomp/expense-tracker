import { useState } from 'react';
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '../hooks/useIncomes';
import { IncomeList } from '../components/IncomeList';
import { IncomeFormModal } from '../components/IncomeFormModal';
import type { Income, CreateIncomeRequest } from '../types/income.types';

export function IncomesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const { data: incomes, isLoading, error } = useIncomes();
  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const deleteMutation = useDeleteIncome();

  const handleCreate = (data: CreateIncomeRequest) => {
    createMutation.mutate(data);
    setIsModalOpen(false);
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsModalOpen(true);
  };

  const handleUpdate = (data: CreateIncomeRequest) => {
    if (editingIncome) {
      updateMutation.mutate({ id: editingIncome.id, data });
      setEditingIncome(null);
      setIsModalOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingIncome(null);
  };

  const totalIncome = incomes?.reduce((sum, income) => sum + income.amount, 0) || 0;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Income Tracking</h1>
          <p className="text-muted mb-0">Manage your family income sources</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          Add Income
        </button>
      </div>

      {totalIncome > 0 && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Total Income</h5>
            <h2 className="text-success mb-0">
              $
              {totalIncome.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>
            <p className="text-muted small mb-0">All recorded income</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          Error loading incomes. Please try again.
        </div>
      )}

      {!isLoading && !error && incomes && (
        <div className="card">
          <div className="card-body">
            <IncomeList incomes={incomes} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        </div>
      )}

      <IncomeFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={editingIncome ? handleUpdate : handleCreate}
        editingIncome={editingIncome}
      />
    </div>
  );
}
