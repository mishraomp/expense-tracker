import { useState } from 'react';
import {
  useSubcategories,
  useCreateSubcategory,
  useDeleteSubcategory,
  useUpdateSubcategory,
} from '../api/subcategoryApi';
import api from '../../../services/api';
import type { Category } from '../types/expense.types';

interface SubcategoryManagerProps {
  category: Category;
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
  return !(startDate.startsWith('1970-') && endDate.startsWith('9999-'));
}

export default function SubcategoryManager({ category }: SubcategoryManagerProps) {
  const { data: subcategories, isLoading } = useSubcategories(category.id);
  const create = useCreateSubcategory();
  const del = useDeleteSubcategory();
  const upd = useUpdateSubcategory();
  const [name, setName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [budgetStartDate, setBudgetStartDate] = useState('');
  const [budgetEndDate, setBudgetEndDate] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');
  const [editingBudgetPeriod, setEditingBudgetPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [editingBudgetStartDate, setEditingBudgetStartDate] = useState('');
  const [editingBudgetEndDate, setEditingBudgetEndDate] = useState('');
  const [editingUseDateRange, setEditingUseDateRange] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const payload: {
        name: string;
        categoryId: string;
        budgetAmount?: string;
        budgetPeriod?: 'monthly' | 'annual';
        budgetStartDate?: string;
        budgetEndDate?: string;
      } = {
        name: name.trim(),
        categoryId: category.id,
      };

      if (budgetAmount) {
        payload.budgetAmount = budgetAmount;
        if (useDateRange && budgetStartDate && budgetEndDate) {
          payload.budgetStartDate = budgetStartDate;
          payload.budgetEndDate = budgetEndDate;
        } else {
          payload.budgetPeriod = budgetPeriod;
        }
      }

      await create.mutateAsync(payload);
      setName('');
      setBudgetAmount('');
      setBudgetPeriod('monthly');
      setBudgetStartDate('');
      setBudgetEndDate('');
      setUseDateRange(false);
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create subcategory:', err);
    }
  };

  const handleUseDateRangeToggle = (checked: boolean) => {
    setUseDateRange(checked);
    if (checked && !budgetStartDate && !budgetEndDate) {
      const defaults = getDefaultBudgetDates();
      setBudgetStartDate(defaults.start);
      setBudgetEndDate(defaults.end);
    }
  };

  const handleEditingUseDateRangeToggle = (checked: boolean) => {
    setEditingUseDateRange(checked);
    if (checked && !editingBudgetStartDate && !editingBudgetEndDate) {
      const defaults = getDefaultBudgetDates();
      setEditingBudgetStartDate(defaults.start);
      setEditingBudgetEndDate(defaults.end);
    }
  };

  const handleStartEdit = (
    id: string,
    currentName: string,
    currentBudget?: string | null,
    currentPeriod?: string | null,
    currentStartDate?: string | null,
    currentEndDate?: string | null,
  ) => {
    setEditingId(id);
    setEditingName(currentName);
    setEditingBudgetAmount(currentBudget || '');
    setEditingBudgetPeriod((currentPeriod as 'monthly' | 'annual') || 'monthly');

    const hasCustom = hasCustomDateRange(currentStartDate, currentEndDate);
    setEditingUseDateRange(hasCustom);
    if (hasCustom) {
      setEditingBudgetStartDate(currentStartDate || '');
      setEditingBudgetEndDate(currentEndDate || '');
    } else {
      setEditingBudgetStartDate('');
      setEditingBudgetEndDate('');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    try {
      const payload: {
        name: string;
        budgetAmount?: string | null;
        budgetPeriod?: 'monthly' | 'annual' | null;
        budgetStartDate?: string | null;
        budgetEndDate?: string | null;
      } = { name: trimmed };

      if (!editingBudgetAmount) {
        payload.budgetAmount = null;
        payload.budgetPeriod = null;
        payload.budgetStartDate = null;
        payload.budgetEndDate = null;
      } else {
        payload.budgetAmount = editingBudgetAmount;
        if (editingUseDateRange && editingBudgetStartDate && editingBudgetEndDate) {
          payload.budgetStartDate = editingBudgetStartDate;
          payload.budgetEndDate = editingBudgetEndDate;
          payload.budgetPeriod = null;
        } else {
          payload.budgetPeriod = editingBudgetPeriod;
          payload.budgetStartDate = null;
          payload.budgetEndDate = null;
        }
      }

      await upd.mutateAsync({ id: editingId, data: payload });
      setEditingId(null);
      setEditingName('');
      setEditingBudgetAmount('');
      setEditingBudgetPeriod('monthly');
      setEditingBudgetStartDate('');
      setEditingBudgetEndDate('');
      setEditingUseDateRange(false);
    } catch (err) {
      console.error('Failed to rename subcategory:', err);
    }
  };

  const handleDelete = async (id: string, subcatName: string) => {
    try {
      const res = await api.get(`/subcategories/${id}/expenses-count`);
      const count = res.data?.count ?? 0;
      const confirmMsg =
        count > 0
          ? `Delete subcategory "${subcatName}"? ${count} linked expense(s) will keep the category and lose subcategory.`
          : `Delete subcategory "${subcatName}"?`;
      if (!confirm(confirmMsg)) return;
      await del.mutateAsync({ id, categoryId: category.id });
    } catch (err) {
      console.error('Failed to delete subcategory:', err);
    }
  };

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0 text-muted">Subcategories</h6>
        <button className="btn btn-sm btn-outline-primary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Subcategory'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="mb-3">
          <div className="input-group input-group-sm mb-2">
            <input
              type="text"
              className="form-control"
              placeholder="Subcategory name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
          <div className="row g-2 mb-2">
            <div className="col-6">
              <input
                type="number"
                step="0.01"
                className="form-control form-control-sm"
                placeholder="Budget (optional)"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </div>
            {budgetAmount && !useDateRange && (
              <div className="col-6">
                <select
                  className="form-select form-select-sm"
                  value={budgetPeriod}
                  onChange={(e) => setBudgetPeriod(e.target.value as 'monthly' | 'annual')}
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            )}
          </div>
          {budgetAmount && (
            <>
              <div className="form-check form-check-sm mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="newSubcatUseDateRange"
                  checked={useDateRange}
                  onChange={(e) => handleUseDateRangeToggle(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="newSubcatUseDateRange">
                  Custom date range
                </label>
              </div>
              {useDateRange && (
                <div className="row g-2">
                  <div className="col-6">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={budgetStartDate}
                      onChange={(e) => setBudgetStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={budgetEndDate}
                      onChange={(e) => setBudgetEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
          {create.isError && (
            <div className="text-danger small mt-1">Failed to create subcategory</div>
          )}
        </form>
      )}

      {isLoading && (
        <div className="text-muted small">
          <span className="spinner-border spinner-border-sm me-2" />
          Loading subcategories...
        </div>
      )}

      {!isLoading && subcategories && subcategories.length > 0 && (
        <ul className="list-group list-group-sm">
          {subcategories.map((sub) => (
            <li
              key={sub.id}
              className="list-group-item list-group-item-sm d-flex justify-content-between align-items-center py-1 px-2"
            >
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                {editingId === sub.id ? (
                  <div className="w-100">
                    <input
                      className="form-control form-control-sm mb-1"
                      placeholder="Name"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                    <div className="row g-1 mb-1">
                      <div className="col-6">
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm"
                          placeholder="Budget"
                          value={editingBudgetAmount}
                          onChange={(e) => setEditingBudgetAmount(e.target.value)}
                        />
                      </div>
                      {editingBudgetAmount && !editingUseDateRange && (
                        <div className="col-6">
                          <select
                            className="form-select form-select-sm"
                            value={editingBudgetPeriod}
                            onChange={(e) =>
                              setEditingBudgetPeriod(e.target.value as 'monthly' | 'annual')
                            }
                          >
                            <option value="monthly">Monthly</option>
                            <option value="annual">Annual</option>
                          </select>
                        </div>
                      )}
                    </div>
                    {editingBudgetAmount && (
                      <>
                        <div className="form-check form-check-sm mb-1">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`editSubcatUseDateRange-${sub.id}`}
                            checked={editingUseDateRange}
                            onChange={(e) => handleEditingUseDateRangeToggle(e.target.checked)}
                          />
                          <label
                            className="form-check-label small"
                            htmlFor={`editSubcatUseDateRange-${sub.id}`}
                          >
                            Custom dates
                          </label>
                        </div>
                        {editingUseDateRange && (
                          <div className="row g-1">
                            <div className="col-6">
                              <input
                                type="date"
                                className="form-control form-control-sm"
                                value={editingBudgetStartDate}
                                onChange={(e) => setEditingBudgetStartDate(e.target.value)}
                              />
                            </div>
                            <div className="col-6">
                              <input
                                type="date"
                                className="form-control form-control-sm"
                                value={editingBudgetEndDate}
                                onChange={(e) => setEditingBudgetEndDate(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="d-flex flex-column">
                    <span className="small">{sub.name}</span>
                    {sub.budgetAmount && (
                      <span className="text-muted text-xs">
                        Budget: ${sub.budgetAmount}
                        {sub.budgetPeriod && ` (${sub.budgetPeriod})`}
                        {hasCustomDateRange(sub.budgetStartDate, sub.budgetEndDate) &&
                          ` ${sub.budgetStartDate} - ${sub.budgetEndDate}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="btn-group btn-group-sm">
                {editingId === sub.id ? (
                  <>
                    <button
                      className="btn btn-outline-primary"
                      onClick={handleSaveEdit}
                      disabled={upd.isPending}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        handleStartEdit(
                          sub.id,
                          sub.name,
                          sub.budgetAmount,
                          sub.budgetPeriod,
                          sub.budgetStartDate,
                          sub.budgetEndDate,
                        )
                      }
                    >
                      Rename
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(sub.id, sub.name)}
                      disabled={del.isPending}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && subcategories && subcategories.length === 0 && !isAdding && (
        <p className="text-muted small mb-0">No subcategories yet</p>
      )}
    </div>
  );
}
