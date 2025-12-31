import { useState } from 'react';
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '../hooks/useIncomes';
import { IncomeList } from '../components/IncomeList';
import { IncomeFormModal } from '../components/IncomeFormModal';
import type { Income, CreateIncomeRequest } from '../types/income.types';

export function IncomesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');

  const query =
    selectedYear === 'all'
      ? undefined
      : {
          year: selectedYear,
          ...(selectedMonth === 'all' ? {} : { month: selectedMonth }),
        };

  const { data: incomes, isLoading, error } = useIncomes(query);
  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const deleteMutation = useDeleteIncome();

  const handleCreate = async (data: CreateIncomeRequest) => {
    const result = await createMutation.mutateAsync(data);
    setIsModalOpen(false);
    return result;
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsModalOpen(true);
  };

  const handleUpdate = async (data: CreateIncomeRequest) => {
    if (editingIncome) {
      await updateMutation.mutateAsync({ id: editingIncome.id, data });
      setEditingIncome(null);
      setIsModalOpen(false);
      return { id: editingIncome.id };
    }
    return { id: '' };
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingIncome(null);
  };

  const totalIncome = incomes?.reduce((sum, income) => sum + income.amount, 0) || 0;

  const monthLabels = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const yearOptions = (() => {
    const current = now.getFullYear();
    const years: number[] = [];
    for (let y = current + 1; y >= current - 10; y--) {
      years.push(y);
    }
    return years;
  })();

  const periodLabel =
    selectedYear === 'all'
      ? 'All recorded income'
      : selectedMonth === 'all'
        ? `Income for ${selectedYear}`
        : `Income for ${monthLabels[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h1 className="h3 mb-1">Income Tracking</h1>
          <p className="text-muted mb-3">Manage your family income sources</p>

          <div className="d-flex align-items-end flex-wrap gap-3">
            <div>
              <label className="form-label mb-1" htmlFor="income-year">
                Year
              </label>
              <select
                id="income-year"
                className="form-select"
                value={selectedYear}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    setSelectedYear('all');
                    setSelectedMonth('all');
                    return;
                  }
                  setSelectedYear(Number(value));
                }}
              >
                <option value="all">All years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label mb-1" htmlFor="income-month">
                Month (optional)
              </label>
              <select
                id="income-month"
                className="form-select"
                value={selectedMonth}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    setSelectedMonth('all');
                    return;
                  }
                  setSelectedMonth(Number(value));
                }}
                disabled={selectedYear === 'all'}
              >
                <option value="all">All months</option>
                {monthLabels.map((label, idx) => (
                  <option key={label} value={idx + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
            <p className="text-muted small mb-0">{periodLabel}</p>
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
