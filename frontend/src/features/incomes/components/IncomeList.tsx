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

  return (
    <div className="table-responsive">
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
    </div>
  );
}
