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
}

const columnHelper = createColumnHelper<Expense>();

export default function ExpensesTable({ filters = {}, onEdit }: ExpensesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

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

  const columns = useMemo(
    () => [
      columnHelper.accessor('date', {
        header: 'Date',
        cell: (info) => {
          const dateValue = info.getValue();
          return toYYYYMMDD(dateValue as string | Date);
        },
        size: 120,
      }),
      columnHelper.accessor('amount', {
        header: 'Amount',
        cell: (info) => `$${info.getValue().toFixed(2)}`,
        size: 100,
      }),
      columnHelper.accessor((row) => row.category?.name, {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => {
          const categoryName = row.original.category?.name || 'N/A';
          const colorCode = row.original.category?.colorCode;
          const bgColor = colorCode || '#6c757d'; // default gray
          return (
            <span className="badge text-white" style={{ backgroundColor: bgColor }}>
              {categoryName}
            </span>
          );
        },
        size: 150,
      }),
      columnHelper.accessor((row) => row.subcategory?.name, {
        id: 'subcategory',
        header: 'Subcategory',
        cell: ({ row }) => {
          const subcategoryName = row.original.subcategory?.name || '-';
          if (!row.original.subcategory?.name) return subcategoryName;
          const colorCode = row.original.category?.colorCode;
          const bgColor = colorCode || '#6c757d'; // use category color
          return (
            <span className="badge text-white" style={{ backgroundColor: bgColor, opacity: 0.75 }}>
              {subcategoryName}
            </span>
          );
        },
        size: 150,
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: (info) => info.getValue() || '-',
        size: 250,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="d-flex gap-1">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleEdit(row.original)}
              aria-label={`Edit expense from ${row.original.date}`}
            >
              Edit
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleDeleteClick(row.original)}
              aria-label={`Delete expense from ${row.original.date}`}
            >
              Delete
            </button>
          </div>
        ),
        size: 140,
      }),
    ],
    [handleEdit, handleDeleteClick],
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
          <h6 className="mb-0">
            Expenses
            <span className="badge bg-secondary ms-2">{data.pagination.total}</span>
          </h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
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
                  <tr key={row.id}>
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
