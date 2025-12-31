import { useState } from 'react';
import { useCategories, useDeleteCategory } from '../api/categoryApi';
import type { Category } from '../types/expense.types';
import CreateCategoryModal from './CreateCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import SubcategoryManager from './SubcategoryManager';

function getDefaultDateRange() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  return {
    startDate: startOfYear.toISOString().split('T')[0],
    endDate: endOfYear.toISOString().split('T')[0],
  };
}

export default function CategoryList() {
  const defaults = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);

  // Use the midpoint of the range as the target date for budget lookup
  const targetDate = startDate || undefined;

  const { data: categories, isLoading, error } = useCategories(targetDate);
  const del = useDeleteCategory();
  const [isOpen, setOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Filter categories to show only those with budgets overlapping the date range
  const filterByDateRange = (cats: Category[]) => {
    if (!startDate && !endDate) return cats;

    return cats.map((cat) => {
      // Check if category budget overlaps with the filter range
      const catStart = cat.budgetStartDate;
      const catEnd = cat.budgetEndDate;

      // If category has no budget dates, keep it but show no budget
      if (!catStart || !catEnd) {
        return cat;
      }

      // Check overlap: budget range overlaps filter range
      const filterStart = startDate || '1970-01-01';
      const filterEnd = endDate || '9999-12-31';
      const overlaps = catStart <= filterEnd && catEnd >= filterStart;

      if (!overlaps) {
        // Return category without budget info (budget not active in range)
        return {
          ...cat,
          budgetAmount: null,
          budgetPeriod: null,
          budgetStartDate: null,
          budgetEndDate: null,
        };
      }

      return cat;
    });
  };

  const filteredCategories = filterByDateRange(categories || []);
  const custom = filteredCategories.filter((c) => c.type === 'custom');
  const predefined = filteredCategories.filter((c) => c.type === 'predefined');

  const onDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    await del.mutateAsync(cat.id);
  };

  const setPreset = (preset: 'thisYear' | 'lastYear' | 'thisMonth' | 'all') => {
    const now = new Date();
    switch (preset) {
      case 'thisYear':
        setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
        setEndDate(new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]);
        break;
      case 'lastYear':
        setStartDate(new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]);
        setEndDate(new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]);
        break;
      case 'thisMonth':
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
        setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Categories</h5>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          New Category
        </button>
      </div>
      <div className="card-body">
        {/* Date Range Filter */}
        <div className="mb-3 p-3 bg-light rounded">
          <label className="form-label fw-semibold mb-2">Filter Budgets by Date Range:</label>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            <div className="btn-group btn-group-sm" role="group" aria-label="Quick date presets">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setPreset('thisMonth')}
              >
                This Month
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setPreset('thisYear')}
              >
                This Year
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setPreset('lastYear')}
              >
                Last Year
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setPreset('all')}
              >
                All Time
              </button>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="startDate" className="form-label mb-0 small">
                From:
              </label>
              <input
                type="date"
                id="startDate"
                className="form-control form-control-sm"
                style={{ width: 'auto' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="endDate" className="form-label mb-0 small">
                To:
              </label>
              <input
                type="date"
                id="endDate"
                className="form-control form-control-sm"
                style={{ width: 'auto' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <span className="text-muted small">
                Showing budgets active between <strong>{startDate || 'beginning'}</strong> and{' '}
                <strong>{endDate || 'end'}</strong>
              </span>
            )}
          </div>
        </div>
        {isLoading && (
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status" />
            <span>Loading categories...</span>
          </div>
        )}
        {error && <div className="alert alert-danger">Failed to load categories</div>}
        {!isLoading && !error && (
          <div className="row g-4">
            <div className="col-md-6">
              <h6>Predefined</h6>
              <ul className="list-group">
                {predefined.map((c) => (
                  <li key={c.id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex flex-column">
                        <span>
                          <span
                            className="me-2"
                            style={{
                              display: 'inline-block',
                              width: 12,
                              height: 12,
                              backgroundColor: c.colorCode || '#ccc',
                            }}
                          />
                          {c.name}
                        </span>
                        {c.budgetAmount && (
                          <span className="text-muted small ms-4">
                            Budget: ${c.budgetAmount} ( ${c.budgetStartDate} - ${c.budgetEndDate} )
                          </span>
                        )}
                      </div>
                      <div className="d-flex gap-2 align-items-center">
                        <span className="badge bg-secondary">predefined</span>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            title="View (predefined categories are read-only)"
                            onClick={() => setEditId(c.id)}
                          >
                            View
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() =>
                              setExpandedCategory(expandedCategory === c.id ? null : c.id)
                            }
                          >
                            {expandedCategory === c.id ? '−' : '+'}
                          </button>
                        </div>
                      </div>
                    </div>
                    {expandedCategory === c.id && <SubcategoryManager category={c} />}
                  </li>
                ))}
                {predefined.length === 0 && <li className="list-group-item text-muted">None</li>}
              </ul>
            </div>
            <div className="col-md-6">
              <h6>Custom</h6>
              <ul className="list-group">
                {custom.map((c) => (
                  <li key={c.id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex flex-column">
                        <span>
                          <span
                            className="me-2"
                            style={{
                              display: 'inline-block',
                              width: 12,
                              height: 12,
                              backgroundColor: c.colorCode || '#ccc',
                            }}
                          />
                          {c.name}
                        </span>
                        {c.budgetAmount && (
                          <span className="text-muted small ms-4">
                            Budget: ${c.budgetAmount} ( ${c.budgetStartDate} - ${c.budgetEndDate} )
                          </span>
                        )}
                      </div>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            setExpandedCategory(expandedCategory === c.id ? null : c.id)
                          }
                        >
                          {expandedCategory === c.id ? '−' : '+'}
                        </button>
                        <button className="btn btn-outline-primary" onClick={() => setEditId(c.id)}>
                          Edit
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => onDelete(c)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    {expandedCategory === c.id && <SubcategoryManager category={c} />}
                  </li>
                ))}
                {custom.length === 0 && (
                  <li className="list-group-item text-muted">No custom categories</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
      <CreateCategoryModal isOpen={isOpen} onClose={() => setOpen(false)} />
      <EditCategoryModal isOpen={!!editId} categoryId={editId} onClose={() => setEditId(null)} />
    </div>
  );
}
