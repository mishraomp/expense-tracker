import React from 'react';
import { useCategories } from '../api/categoryApi';
import { useSubcategories } from '../api/subcategoryApi';

import type { ExpenseListQuery } from '../types/expense.types';

interface ExpenseFiltersProps {
  value?: Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'>;
  onChange?: (filters: Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'>) => void;
}

export default function ExpenseFilters({ value, onChange }: ExpenseFiltersProps) {
  const { data: categories } = useCategories();
  const now = new Date();

  // Controlled values derived from parent
  const categoryId = value?.categoryId ?? '';
  const subcategoryId = value?.subcategoryId ?? '';
  const startDate = value?.startDate ?? '';
  const endDate = value?.endDate ?? '';
  const year = value?.filterYear ? String(value.filterYear) : '';
  const month = value?.filterMonth ? String(value.filterMonth).padStart(2, '0') : '';

  const isYearMonthActive = Boolean(year || month);
  const isRangeActive = Boolean(startDate || endDate);

  const { data: subcategories } = useSubcategories(categoryId || undefined);

  const emit = (partial: Partial<Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'>>) => {
    const merged: Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'> = {
      ...(categoryId ? { categoryId } : {}),
      ...(subcategoryId ? { subcategoryId } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(year ? { filterYear: parseInt(year, 10) } : {}),
      ...(year && month ? { filterMonth: parseInt(month, 10) } : {}),
      ...partial,
    };
    onChange?.(merged);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    emit({ categoryId: next || undefined, subcategoryId: undefined });
  };
  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    emit({ subcategoryId: next || undefined });
  };
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const y = e.target.value;
    if (!y) {
      emit({ filterYear: undefined, filterMonth: undefined });
    } else {
      emit({ filterYear: parseInt(y, 10), filterMonth: month ? parseInt(month, 10) : undefined });
    }
  };
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = e.target.value;
    if (!year) emit({ filterMonth: undefined });
    else emit({ filterMonth: m ? parseInt(m, 10) : undefined });
  };
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    emit({ startDate: e.target.value || undefined, filterYear: undefined, filterMonth: undefined });
  };
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    emit({ endDate: e.target.value || undefined, filterYear: undefined, filterMonth: undefined });
  };
  const handleClear = () => onChange?.({});

  return (
    <div className="card mb-2">
      <div className="card-header py-2">
        <h6 className="mb-0">Filters</h6>
      </div>
      <div className="card-body p-2">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label htmlFor="filterCategory" className="form-label small mb-1">
              Category
            </label>
            <select
              id="filterCategory"
              className="form-select"
              value={categoryId}
              onChange={handleCategoryChange}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label htmlFor="filterSubcategory" className="form-label small mb-1">
              Subcategory
            </label>
            <select
              id="filterSubcategory"
              className="form-select"
              value={subcategoryId}
              onChange={handleSubcategoryChange}
              aria-label="Filter by subcategory"
              disabled={!categoryId}
            >
              <option value="">All subcategories</option>
              {(subcategories || [])
                .filter((s) => s.categoryId === categoryId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="col-md-2">
            <label htmlFor="filterYear" className="form-label small mb-1">
              Year
            </label>
            <select
              id="filterYear"
              className="form-select"
              value={year}
              onChange={handleYearChange}
              aria-label="Filter by year"
              disabled={isRangeActive}
            >
              <option value="">All years</option>
              {Array.from({ length: 11 }).map((_, idx) => {
                const y = now.getFullYear() - idx;
                return (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="col-md-2">
            <label htmlFor="filterMonth" className="form-label small mb-1">
              Month
            </label>
            <select
              id="filterMonth"
              className="form-select"
              value={month}
              onChange={handleMonthChange}
              aria-label="Filter by month"
              disabled={isRangeActive}
            >
              <option value="">All months</option>
              {[
                '01-January',
                '02-February',
                '03-March',
                '04-April',
                '05-May',
                '06-June',
                '07-July',
                '08-August',
                '09-September',
                '10-October',
                '11-November',
                '12-December',
              ].map((item) => {
                const [value, label] = item.split('-');
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
            {!year && month && (
              <div className="form-text">Select a year to apply month filter.</div>
            )}
          </div>
          <div className="col-md-2">
            <label htmlFor="filterStart" className="form-label small mb-1">
              Start date
            </label>
            <input
              id="filterStart"
              type="date"
              className="form-control"
              value={startDate}
              onChange={handleStartDateChange}
              disabled={isYearMonthActive}
            />
          </div>
          <div className="col-md-2">
            <label htmlFor="filterEnd" className="form-label small mb-1">
              End date
            </label>
            <input
              id="filterEnd"
              type="date"
              className="form-control"
              value={endDate}
              onChange={handleEndDateChange}
              disabled={isYearMonthActive}
            />
          </div>
          <div className="col-md-2">
            <button
              className="btn btn-outline-secondary w-100"
              onClick={handleClear}
              aria-label="Clear filters"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
