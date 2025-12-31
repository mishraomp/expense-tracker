import { useEffect, useMemo, useState } from 'react';
import { useCategories, useUpdateCategory } from '../api/categoryApi';
import type { Category } from '../types/expense.types';

interface Props {
  isOpen: boolean;
  categoryId: string | null;
  onClose: () => void;
}

/**
 * Returns default budget date range (Jan 1 - Dec 31 of current year)
 */
function getDefaultBudgetDates(): { start: string; end: string } {
  const year = new Date().getFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

/**
 * Checks if the budget has a custom date range (not wide legacy range)
 */
function hasCustomDateRange(startDate?: string | null, endDate?: string | null): boolean {
  if (!startDate || !endDate) return false;
  // Legacy budgets use 1970-01-01 to 9999-12-31
  return !(startDate.startsWith('1970-') && endDate.startsWith('9999-'));
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
  const [budgetStartDate, setBudgetStartDate] = useState('');
  const [budgetEndDate, setBudgetEndDate] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);

  useEffect(() => {
    if (isOpen && cat) {
      // Defer state updates to avoid synchronous setState in effects
      setTimeout(() => {
        setName(cat.name || '');
        setColorCode(cat.colorCode || '');
        setIcon(cat.icon || '');
        setBudgetAmount(cat.budgetAmount || '');
        setBudgetPeriod((cat.budgetPeriod as 'monthly' | 'annual') || 'monthly');

        // Check if category has a custom date range
        const hasCustom = hasCustomDateRange(cat.budgetStartDate, cat.budgetEndDate);
        setUseDateRange(hasCustom);
        if (hasCustom) {
          setBudgetStartDate(cat.budgetStartDate || '');
          setBudgetEndDate(cat.budgetEndDate || '');
        } else {
          setBudgetStartDate('');
          setBudgetEndDate('');
        }
      }, 0);
    }
    if (!isOpen) {
      setTimeout(() => {
        setName('');
        setColorCode('');
        setIcon('');
        setBudgetAmount('');
        setBudgetPeriod('monthly');
        setBudgetStartDate('');
        setBudgetEndDate('');
        setUseDateRange(false);
      }, 0);
    }
  }, [isOpen, cat]);

  if (!isOpen || !cat) return null;

  const isPredefined = cat.type === 'predefined';

  const handleUseDateRangeToggle = (checked: boolean) => {
    setUseDateRange(checked);
    if (checked && !budgetStartDate && !budgetEndDate) {
      const defaults = getDefaultBudgetDates();
      setBudgetStartDate(defaults.start);
      setBudgetEndDate(defaults.end);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    type PayloadType = {
      colorCode?: string;
      name?: string;
      icon?: string;
      budgetAmount?: string | null;
      budgetPeriod?: 'monthly' | 'annual' | null;
      budgetStartDate?: string | null;
      budgetEndDate?: string | null;
    };

    const payload: PayloadType = isPredefined
      ? {
          // Only allow color and budget fields for predefined categories
          colorCode: colorCode || undefined,
        }
      : {
          name: name || undefined,
          colorCode: colorCode || undefined,
          icon: icon || undefined,
        };

    // Handle budget fields
    if (budgetAmount === '') {
      payload.budgetAmount = null;
      payload.budgetPeriod = null;
      payload.budgetStartDate = null;
      payload.budgetEndDate = null;
    } else {
      payload.budgetAmount = budgetAmount;
      if (useDateRange && budgetStartDate && budgetEndDate) {
        payload.budgetStartDate = budgetStartDate;
        payload.budgetEndDate = budgetEndDate;
        payload.budgetPeriod = null;
      } else {
        payload.budgetPeriod = budgetPeriod;
        payload.budgetStartDate = null;
        payload.budgetEndDate = null;
      }
    }

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
                <>
                  <div className="mb-3 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="useDateRange"
                      checked={useDateRange}
                      onChange={(e) => handleUseDateRangeToggle(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="useDateRange">
                      Use custom date range
                    </label>
                  </div>
                  {useDateRange ? (
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label htmlFor="catBudgetStart" className="form-label">
                          Start Date
                        </label>
                        <input
                          id="catBudgetStart"
                          type="date"
                          className="form-control"
                          value={budgetStartDate}
                          onChange={(e) => setBudgetStartDate(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label htmlFor="catBudgetEnd" className="form-label">
                          End Date
                        </label>
                        <input
                          id="catBudgetEnd"
                          type="date"
                          className="form-control"
                          value={budgetEndDate}
                          onChange={(e) => setBudgetEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
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
                </>
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
