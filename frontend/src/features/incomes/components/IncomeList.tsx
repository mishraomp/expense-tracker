import { useState } from 'react';
import type { Income } from '../types/income.types';
import { toYYYYMMDD } from '@/services/date';

interface IncomeListProps {
  incomes: Income[];
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
}

export function IncomeList({ incomes, onEdit, onDelete }: IncomeListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => toYYYYMMDD(dateString);

  const formatSource = (source: string) => {
    return source.charAt(0).toUpperCase() + source.slice(1);
  };

  const formatFrequency = (freq: string) => {
    return freq.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const renderMobileIncomeList = () => {
    if (incomes.length === 0) {
      return <p className="d-lg-none text-center text-muted mb-0">No income records found</p>;
    }

    return (
      <div className="income-mobile-list d-lg-none">
        {incomes.map((income) => (
          <article className="income-mobile-row" key={income.id}>
            <div className="d-flex justify-content-between align-items-center gap-2">
              <span className="text-nowrap">{formatDate(income.date)}</span>
              <strong className="text-success text-nowrap">{formatCurrency(income.amount)}</strong>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
              <span className="badge bg-primary">{formatSource(income.source)}</span>
              <span className="text-muted small">{formatFrequency(income.frequency)}</span>
              <span className={`badge ${income.isRecurring ? 'bg-info' : 'bg-secondary'}`}>
                {income.isRecurring ? 'Recurring' : 'One-time'}
              </span>
            </div>
            {income.employer && <p className="mb-0 mt-2 small">{income.employer}</p>}
            {income.description && (
              <p className="income-mobile-row__description text-muted small mb-0 mt-1">
                {income.description}
              </p>
            )}
            <div className="income-mobile-row__actions d-flex gap-2 mt-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => onEdit(income)}
                aria-label={`Edit income from ${formatDate(income.date)}`}
                title="Edit income"
              >
                <i className="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => setDeleteId(income.id)}
                aria-label={`Delete income from ${formatDate(income.date)}`}
                title="Delete income"
              >
                <i className="bi bi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <>
      {renderMobileIncomeList()}
      <div className="table-responsive d-none d-lg-block">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Source</th>
              <th>Frequency</th>
              <th>Employer</th>
              <th>Description</th>
              <th>Recurring</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {incomes.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted">
                  No income records found
                </td>
              </tr>
            ) : (
              incomes.map((income) => (
                <tr key={income.id}>
                  <td>{formatDate(income.date)}</td>
                  <td className="fw-bold text-success">{formatCurrency(income.amount)}</td>
                  <td>
                    <span className="badge bg-primary">{formatSource(income.source)}</span>
                  </td>
                  <td>{formatFrequency(income.frequency)}</td>
                  <td>{income.employer || '-'}</td>
                  <td>{income.description || '-'}</td>
                  <td>
                    {income.isRecurring ? (
                      <span className="badge bg-info">Recurring</span>
                    ) : (
                      <span className="badge bg-secondary">One-time</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => onEdit(income)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setDeleteId(income.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="modal show d-block modal-backdrop-custom" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteId(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this income record?</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    onDelete(deleteId);
                    setDeleteId(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
