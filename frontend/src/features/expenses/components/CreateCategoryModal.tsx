import { useEffect, useState } from 'react';
import { useCreateCategory } from '../api/categoryApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateCategoryModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [icon, setIcon] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'annual'>('monthly');
  const createCategory = useCreateCategory();

  useEffect(() => {
    if (!isOpen) {
      // Defer state resets to avoid calling setState synchronously in an effect
      setTimeout(() => {
        setName('');
        setColorCode('');
        setIcon('');
        setBudgetAmount('');
        setBudgetPeriod('monthly');
      }, 0);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCategory.mutateAsync({
      name,
      colorCode: colorCode || undefined,
      icon: icon || undefined,
      budgetAmount: budgetAmount ? parseFloat(budgetAmount) : undefined,
      budgetPeriod: budgetAmount ? budgetPeriod : undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="createCategoryLabel"
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="createCategoryLabel">
              Create Category
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="catName" className="form-label">
                  Name
                </label>
                <input
                  id="catName"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="catColor" className="form-label">
                  Color (hex)
                </label>
                <input
                  id="catColor"
                  className="form-control"
                  placeholder="#RRGGBB"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="catIcon" className="form-label">
                  Icon
                </label>
                <input
                  id="catIcon"
                  className="form-control"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="catBudgetAmount" className="form-label">
                  Budget Amount (optional)
                </label>
                <input
                  id="catBudgetAmount"
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                />
              </div>
              {budgetAmount && (
                <div className="mb-3">
                  <label htmlFor="catBudgetPeriod" className="form-label">
                    Budget Period
                  </label>
                  <select
                    id="catBudgetPeriod"
                    className="form-select"
                    value={budgetPeriod}
                    onChange={(e) => setBudgetPeriod(e.target.value as 'monthly' | 'annual')}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={createCategory.isPending}>
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
