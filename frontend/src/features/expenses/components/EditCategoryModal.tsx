import { useEffect, useMemo, useState } from 'react';
import { useCategories, useUpdateCategory } from '../api/categoryApi';
import type { Category } from '../types/expense.types';

interface Props {
  isOpen: boolean;
  categoryId: string | null;
  onClose: () => void;
}

export default function EditCategoryModal({ isOpen, categoryId, onClose }: Props) {
  const { data: categories } = useCategories();
  const update = useUpdateCategory();

  const cat: Category | undefined = useMemo(
    () => (categories || []).find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const [name, setName] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [icon, setIcon] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    if (isOpen && cat) {
      // Defer state updates to avoid synchronous setState in effects
      setTimeout(() => {
        setName(cat.name || '');
        setColorCode(cat.colorCode || '');
        setIcon(cat.icon || '');
        setBudgetAmount(cat.budgetAmount || '');
        setBudgetPeriod((cat.budgetPeriod as 'monthly' | 'annual') || 'monthly');
      }, 0);
    }
    if (!isOpen) {
      setTimeout(() => {
        setName('');
        setColorCode('');
        setIcon('');
        setBudgetAmount('');
        setBudgetPeriod('monthly');
      }, 0);
    }
  }, [isOpen, cat]);

  if (!isOpen || !cat) return null;

  const isPredefined = cat.type === 'predefined';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    const payload = isPredefined
      ? {
          // Only allow color and budget fields for predefined categories
          colorCode: colorCode || undefined,
          budgetAmount: budgetAmount === '' ? null : budgetAmount,
          budgetPeriod: budgetAmount === '' ? null : budgetPeriod,
        }
      : {
          name: name || undefined,
          colorCode: colorCode || undefined,
          icon: icon || undefined,
          budgetAmount: budgetAmount === '' ? null : budgetAmount,
          budgetPeriod: budgetAmount === '' ? null : budgetPeriod,
        };

    await update.mutateAsync({ id: categoryId, data: payload });
    onClose();
  };

  return (
    <div
      className="modal d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editCategoryLabel"
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="editCategoryLabel">
              Edit Category
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
                  disabled={isPredefined}
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
                  disabled={false}
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
                  disabled={isPredefined}
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
                  disabled={false}
                />
              </div>
              {budgetAmount !== '' && (
                <div className="mb-3">
                  <label htmlFor="catBudgetPeriod" className="form-label">
                    Budget Period
                  </label>
                  <select
                    id="catBudgetPeriod"
                    className="form-select"
                    value={budgetPeriod}
                    onChange={(e) => setBudgetPeriod(e.target.value as 'monthly' | 'annual')}
                    disabled={false}
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
              <button type="submit" className="btn btn-primary" disabled={update.isPending}>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
