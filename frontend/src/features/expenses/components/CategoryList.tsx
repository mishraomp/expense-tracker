import { useState } from 'react';
import { useCategories, useDeleteCategory } from '../api/categoryApi';
import type { Category } from '../types/expense.types';
import CreateCategoryModal from './CreateCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import SubcategoryManager from './SubcategoryManager';

export default function CategoryList() {
  const { data: categories, isLoading, error } = useCategories();
  const del = useDeleteCategory();
  const [isOpen, setOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const custom = (categories || []).filter((c) => c.type === 'custom');
  const predefined = (categories || []).filter((c) => c.type === 'predefined');

  const onDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    await del.mutateAsync(cat.id);
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
                            Budget: ${c.budgetAmount} ({c.budgetPeriod})
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
                            Budget: ${c.budgetAmount} ({c.budgetPeriod})
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
