import { useState } from 'react';
import type { CreateIncomeRequest, IncomeSource, IncomeFrequency } from '../types/income.types';
import { toYYYYMMDD } from '@/services/date';
import UploadWidget from '../../attachments/UploadWidget';

interface IncomeFormProps {
  onSubmit: (data: CreateIncomeRequest) => Promise<{ id: string }>;
  onCancel: () => void;
  initialData?: Partial<CreateIncomeRequest>;
}

export function IncomeForm({ onSubmit, onCancel, initialData }: IncomeFormProps) {
  const [formData, setFormData] = useState<CreateIncomeRequest>({
    amount: initialData?.amount || 0,
    date: initialData?.date || toYYYYMMDD(new Date()),
    source: initialData?.source || 'salary',
    frequency: initialData?.frequency || 'biweekly',
    description: initialData?.description || '',
    employer: initialData?.employer || '',
    isRecurring: initialData?.isRecurring || false,
    numberOfRecurrences: initialData?.numberOfRecurrences || 12,
  });
  const [savedIncomeId, setSavedIncomeId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await onSubmit(formData);
    setSavedIncomeId(result.id);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="amount" className="form-label">
          Amount
        </label>
        <input
          type="number"
          className="form-control"
          id="amount"
          step="0.01"
          min="0.01"
          required
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="date" className="form-label">
          Date
        </label>
        <input
          type="date"
          className="form-control"
          id="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="source" className="form-label">
          Source
        </label>
        <select
          className="form-select"
          id="source"
          required
          value={formData.source}
          onChange={(e) => setFormData({ ...formData, source: e.target.value as IncomeSource })}
        >
          <option value="salary">Salary</option>
          <option value="bonus">Bonus</option>
          <option value="investment">Investment</option>
          <option value="rental">Rental</option>
          <option value="freelance">Freelance</option>
          <option value="gift">Gift</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="mb-3">
        <label htmlFor="frequency" className="form-label">
          Frequency
        </label>
        <select
          className="form-select"
          id="frequency"
          required
          value={formData.frequency}
          onChange={(e) =>
            setFormData({ ...formData, frequency: e.target.value as IncomeFrequency })
          }
        >
          <option value="one_time">One Time</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
      </div>

      <div className="mb-3">
        <label htmlFor="employer" className="form-label">
          Employer
        </label>
        <input
          type="text"
          className="form-control"
          id="employer"
          value={formData.employer}
          onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          className="form-control"
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="mb-3 form-check">
        <input
          type="checkbox"
          className="form-check-input"
          id="isRecurring"
          checked={formData.isRecurring}
          onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
        />
        <label className="form-check-label" htmlFor="isRecurring">
          Recurring Income
        </label>
      </div>

      {formData.isRecurring && (
        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <label htmlFor="numberOfRecurrences" className="form-label">
              Number of Recurrences
            </label>
            <input
              type="number"
              className="form-control"
              id="numberOfRecurrences"
              min={1}
              max={365}
              value={formData.numberOfRecurrences}
              onChange={(e) =>
                setFormData({ ...formData, numberOfRecurrences: Number(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary">
          Save Income
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {savedIncomeId && (
        <div className="mt-3 pt-3 border-top">
          <h6 className="mb-2">Attachments</h6>
          <UploadWidget
            recordType="income"
            recordId={savedIncomeId}
            onUploadComplete={() => {
              // Optionally refresh income data or show success message
            }}
          />
        </div>
      )}
    </form>
  );
}
