import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import { useExpenses } from '../api/expenseApi';
import { toYYYYMMDD } from '@/services/date';
import type { ExpenseListQuery, Expense } from '../types/expense.types';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useDeleteExpense } from '../api/expenseApi';

interface ExpensesTableProps {
  filters?: Omit<ExpenseListQuery, 'page' | 'pageSize'>;
  onEdit?: (expense: Expense) => void;
  onFilterChange?: (filters: Omit<ExpenseListQuery, 'page' | 'pageSize'>) => void;
}

const columnHelper = createColumnHelper<Expense>();

export default function ExpensesTable({
  filters = {},
  onEdit,
  onFilterChange,
}: ExpensesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Reset pagination to page 0 when filters change
  const filterKey = JSON.stringify(filters);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setPrevFilterKey(filterKey);
  }

  const sortField = sorting.length > 0 ? sorting[0].id : 'date';
  const sortDirection = sorting.length > 0 && !sorting[0].desc ? 'asc' : 'desc';

  const queryParams = useMemo(() => {
    return {
      ...filters,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sortOrder: sortDirection as 'asc' | 'desc',
      sortBy: sortField,
    };
  }, [filters, pagination.pageIndex, pagination.pageSize, sortField, sortDirection]);

  const { data, isLoading, error } = useExpenses(queryParams);

  const deleteExpense = useDeleteExpense();

  const handleEdit = useCallback(
    (expense: Expense) => {
      onEdit?.(expense);
    },
    [onEdit],
  );

  const handleDeleteClick = useCallback((expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (expenseToDelete) {
      await deleteExpense.mutateAsync(expenseToDelete.id);
      setDeleteModalOpen(false);
      setExpenseToDelete(null);
    }
  }, [expenseToDelete, deleteExpense]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setExpenseToDelete(null);
  }, []);

  const handleCategoryFilter = useCallback(
    (categoryId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!onFilterChange) return;
      const isSame = filters.categoryId === categoryId;
      onFilterChange({
        ...filters,
        categoryId: isSame ? undefined : categoryId,
        subcategoryId: undefined, // clear subcategory when category changes or toggles off
      });
    },
    [filters, onFilterChange],
  );

  const handleSubcategoryFilter = useCallback(
    (subcategoryId: string, parentCategoryId: string | undefined, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!onFilterChange) return;
      const isSame = filters.subcategoryId === subcategoryId;
      onFilterChange({
        ...filters,
        categoryId: parentCategoryId || filters.categoryId,
        subcategoryId: isSame ? undefined : subcategoryId,
      });
    },
    [filters, onFilterChange],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('date', {
        header: 'Date',
        cell: (info) => {
          const dateValue = info.getValue();
          return <span className="text-nowrap">{toYYYYMMDD(dateValue as string | Date)}</span>;
        },
      }),
      columnHelper.accessor('amount', {
        header: 'Amount',
        cell: (info) => (
          <span className="text-danger text-nowrap">${info.getValue().toFixed(2)}</span>
        ),
      }),
      columnHelper.accessor((row) => row.category?.name, {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => {
          const category = row.original.category;
          const categoryName = category?.name || 'N/A';
          const colorCode = category?.colorCode;
          const bgColor = colorCode || '#6c757d'; // default gray
          const rawIcon = (category?.icon || '').trim();

          const renderIcon = () => {
            if (!rawIcon) return null;
            // URL image
            if (/^https?:\/\//.test(rawIcon)) {
              return (
                <img
                  src={rawIcon}
                  alt="icon"
                  style={{ width: '1em', height: '1em', verticalAlign: 'middle' }}
                />
              );
            }
            // Bootstrap Icons class name e.g. 'bi-bank'
            if (/^bi-[a-z0-9-]+$/i.test(rawIcon)) {
              return <i className={`bi ${rawIcon}`} aria-hidden="true" />;
            }
            // Use DOM decoding for any HTML entity
            if (rawIcon.startsWith('&')) {
              const textarea = document.createElement('textarea');
              textarea.innerHTML = rawIcon.endsWith(';') ? rawIcon : rawIcon + ';';
              const decoded = textarea.value;
              // If it looks like private use (Fxxx), apply bootstrap-icons font
              const codePoint = decoded.codePointAt(0) || 0;
              const isPrivateUse = codePoint >= 0xe000 && codePoint <= 0xf8ff;
              return (
                <span
                  style={{
                    fontFamily: isPrivateUse ? 'bootstrap-icons' : undefined,
                    display: 'inline-block',
                    lineHeight: 1,
                  }}
                >
                  {decoded}
                </span>
              );
            }
            // Otherwise assume already a visible character / emoji / short text
            return rawIcon;
          };

          if (!category) {
            return <span className="badge bg-secondary">{categoryName}</span>;
          }
          const active = filters.categoryId === category.id;
          return (
            <button
              type="button"
              onClick={(e) => handleCategoryFilter(category.id, e)}
              className={`badge text-white d-inline-flex align-items-center gap-1 border-0 text-truncate ${active ? 'shadow-sm' : ''}`}
              style={{
                backgroundColor: bgColor,
                cursor: 'pointer',
                outline: active ? '2px solid #0d6efd' : 'none',
                maxWidth: '120px',
              }}
              title={active ? 'Clear category filter' : `Filter by ${categoryName}`}
            >
              {rawIcon && (
                <span className="me-1" style={{ fontSize: '1.1em', lineHeight: 1 }}>
                  {renderIcon()}
                </span>
              )}
              <span className="text-truncate">{categoryName}</span>
              {active && <i className="bi bi-x ms-1" aria-label="Clear" />}
            </button>
          );
        },
      }),
      columnHelper.accessor((row) => row.subcategory?.name, {
        id: 'subcategory',
        header: 'Subcategory',
        cell: ({ row }) => {
          const subcategory = row.original.subcategory;
          const subcategoryName = subcategory?.name || '-';
          if (!subcategory) return subcategoryName;
          const colorCode = row.original.category?.colorCode;
          const bgColor = colorCode || '#6c757d';
          const active = filters.subcategoryId === subcategory.id;
          return (
            <button
              type="button"
              onClick={(e) => handleSubcategoryFilter(subcategory.id, row.original.category?.id, e)}
              className={`badge text-white border-0 text-truncate ${active ? 'shadow-sm' : ''}`}
              style={{
                backgroundColor: bgColor,
                opacity: 0.75,
                cursor: 'pointer',
                outline: active ? '2px solid #0d6efd' : 'none',
                maxWidth: '120px',
              }}
              title={active ? 'Clear subcategory filter' : `Filter by ${subcategoryName}`}
            >
              <span className="text-truncate">{subcategoryName}</span>
              {active && <i className="bi bi-x ms-1" aria-label="Clear" />}
            </button>
          );
        },
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: (info) => {
          const desc = info.getValue() || '-';
          return (
            <span
              className="d-inline-block text-truncate"
              style={{ maxWidth: '200px' }}
              title={desc}
            >
              {desc}
            </span>
          );
        },
      }),
      columnHelper.accessor('attachmentCount', {
        header: 'Att',
        cell: (info) => {
          const count = info.getValue() as number | undefined;
          return (
            <span className="badge bg-light text-dark" title="Active attachments">
              <i className="bi bi-paperclip me-1" aria-hidden="true"></i>
              {count || 0}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.itemCount ?? row.items?.length ?? 0, {
        id: 'itemCount',
        header: 'Items',
        cell: ({ row }) => {
          // Use itemCount from API or fall back to items array length
          const count = row.original.itemCount ?? row.original.items?.length ?? 0;
          if (count === 0) {
            return <span className="text-muted">-</span>;
          }
          return (
            <span className="badge bg-info text-dark" title={`${count} line item(s)`}>
              <i className="bi bi-list-ul me-1" aria-hidden="true"></i>
              {count}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(row.original);
            }}
            aria-label={`Delete expense from ${row.original.date}`}
          >
            Delete
          </button>
        ),
      }),
    ],
    [
      handleDeleteClick,
      handleCategoryFilter,
      handleSubcategoryFilter,
      filters.categoryId,
      filters.subcategoryId,
    ],
  );

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    pageCount: data?.pagination.totalPages || 0,
    state: {
      sorting,
      pagination,
    },
  });

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading expenses...</span>
          </div>
          <p className="mt-3 mb-0">Loading expenses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            <h5 className="alert-heading">Error Loading Expenses</h5>
            <p className="mb-0">{(error as Error).message || 'Failed to load expenses'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <h5 className="text-muted">No expenses found</h5>
          <p className="text-muted">Start by adding your first expense above.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-header py-2 d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Expenses</h6>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small">
              Total Amount:{' '}
              <strong className="text-danger">
                $
                {data.summary?.totalAmount?.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </strong>
            </span>
            <span className="text-muted small">
              Count: <strong>{data.pagination.total}</strong>
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0" style={{ tableLayout: 'auto' }}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="user-select-none"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? 'cursor-pointer d-flex align-items-center gap-1'
                                : '',
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <span className="ms-1">
                                {{
                                  asc: '↑',
                                  desc: '↓',
                                }[header.column.getIsSorted() as string] ?? '↕'}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={(e) => {
                      // Avoid triggering edit when clicking filter badges
                      const target = e.target as HTMLElement;
                      if (target.closest('button')) return;
                      handleEdit(row.original);
                    }}
                    style={{ cursor: 'pointer' }}
                    className="table-row-clickable"
                    aria-label={`Edit expense from ${row.original.date}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pagination.total > 0 && (
            <div className="card-footer bg-white py-2">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <label htmlFor="pageSize" className="text-muted small mb-0">
                    Show:
                  </label>
                  <select
                    id="pageSize"
                    className="form-select form-select-sm"
                    style={{ width: 'auto' }}
                    value={pagination.pageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setPagination({ pageIndex: 0, pageSize: newSize });
                    }}
                    aria-label="Select page size"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </select>
                  <span className="text-muted small">
                    Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
                    {Math.min(
                      (pagination.pageIndex + 1) * pagination.pageSize,
                      data.pagination.total,
                    )}{' '}
                    of {data.pagination.total}
                  </span>
                </div>
                {table.getPageCount() > 1 && (
                  <nav aria-label="Expense table pagination">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${!table.getCanPreviousPage() ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          aria-label="Previous page"
                        >
                          Previous
                        </button>
                      </li>
                      {[...Array(table.getPageCount())].map((_, i) => (
                        <li
                          key={i}
                          className={`page-item ${pagination.pageIndex === i ? 'active' : ''}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => table.setPageIndex(i)}
                            aria-label={`Page ${i + 1}`}
                            aria-current={pagination.pageIndex === i ? 'page' : undefined}
                          >
                            {i + 1}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item ${!table.getCanNextPage() ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                          aria-label="Next page"
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        expenseAmount={expenseToDelete?.amount || 0}
        expenseDate={expenseToDelete?.date || ''}
      />
    </>
  );
}
