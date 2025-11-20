import type { CreateIncomeRequest, Income } from '../types/income.types';
import { IncomeForm } from './IncomeForm';

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateIncomeRequest) => void;
  editingIncome?: Income | null;
}

export function IncomeFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingIncome,
}: IncomeFormModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (data: CreateIncomeRequest) => {
    onSubmit(data);
    onClose();
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{editingIncome ? 'Edit Income' : 'Add New Income'}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <IncomeForm
              onSubmit={handleSubmit}
              onCancel={onClose}
              initialData={
                editingIncome
                  ? {
                      amount: editingIncome.amount,
                      date: editingIncome.date,
                      source: editingIncome.source,
                      frequency: editingIncome.frequency,
                      description: editingIncome.description ?? undefined,
                      employer: editingIncome.employer ?? undefined,
                      isRecurring: editingIncome.isRecurring ?? undefined,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
