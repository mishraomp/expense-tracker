import { useEffect, useState } from 'react';
import { useCategories } from '../api/categoryApi';
import { useSubcategories } from '../api/subcategoryApi';

import type { ExpenseListQuery } from '../types/expense.types';

interface ExpenseFiltersProps {
  value?: Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'>;
  onChange?: (filters: Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'>) => void;
}

export default function ExpenseFilters({ value, onChange }: ExpenseFiltersProps) {
  const { data: categories } = useCategories();
  const [categoryId, setCategoryId] = useState(value?.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState(value?.subcategoryId || '');
  // Explicit date range inputs
  const [startDate, setStartDate] = useState(value?.startDate || '');
  const [endDate, setEndDate] = useState(value?.endDate || '');
  // New month/year filtering model
  const now = new Date();
  const [year, setYear] = useState<string>('');
  const [month, setMonth] = useState<string>(''); // 1-12 as string

  // Determine if year/month filtering is active
  const isYearMonthActive = Boolean(year || month);
  // Determine if range filtering is active
  const isRangeActive = Boolean(startDate || endDate);

  const { data: subcategories } = useSubcategories(categoryId || undefined);

  // Debounce notify parent to avoid chattiness
  useEffect(() => {
    const t = setTimeout(() => {
      const filterYear = year ? parseInt(year, 10) : undefined;
      const filterMonth = filterYear && month ? parseInt(month, 10) : undefined;

      onChange?.({
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        filterYear,
        filterMonth,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [categoryId, subcategoryId, startDate, endDate, year, month, onChange]);

  // Reset subcategory when category changes
  useEffect(() => {
    // Defer subcategory reset to avoid synchronous setState in effect
    setTimeout(() => setSubcategoryId(''), 0);
  }, [categoryId]);

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
              onChange={(e) => setCategoryId(e.target.value)}
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
              onChange={(e) => setSubcategoryId(e.target.value)}
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
              onChange={(e) => setYear(e.target.value)}
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
              onChange={(e) => setMonth(e.target.value)}
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
              onChange={(e) => setStartDate(e.target.value)}
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
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isYearMonthActive}
            />
          </div>
          <div className="col-md-2">
            <button
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setCategoryId('');
                setSubcategoryId('');
                setYear('');
                setMonth('');
                setStartDate('');
                setEndDate('');
              }}
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
