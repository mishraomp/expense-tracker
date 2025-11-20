import { useExpenseTotals } from '../api/expenseApi';
import type { ExpenseListQuery } from '../types/expense.types';

interface CategorySummaryProps {
  filters?: Omit<ExpenseListQuery, 'page' | 'pageSize' | 'sortOrder'>;
}

export default function CategorySummary({ filters = {} }: CategorySummaryProps) {
  const { data, isLoading } = useExpenseTotals(filters);

  return (
    <div className="card mb-2">
      <div className="card-header py-2">
        <h6 className="mb-0">Summary</h6>
      </div>
      <div className="card-body p-2">
        {isLoading ? (
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status" />
            <span>Loading summary...</span>
          </div>
        ) : (
          <>
            <div className="d-flex justify-content-between">
              <div>
                <div className="text-muted">Total Amount</div>
                <div
                  className={`fw-bold ${data?.budgetAmount && data.total > data.budgetAmount ? 'text-danger' : ''}`}
                >
                  ${data?.total?.toFixed(2) ?? '0.00'}
                </div>
              </div>
              <div>
                <div className="text-muted">Count</div>
                <div className="fw-bold">{data?.count ?? 0}</div>
              </div>
              {data?.budgetAmount && (
                <div>
                  <div className="text-muted">
                    Budget ({data.budgetSource === 'subcategory' ? 'Subcategory' : 'Category'}{' '}
                    {data.budgetPeriod === 'monthly' ? 'Monthly' : 'Annual'})
                  </div>
                  <div className="fw-bold">${data.budgetAmount.toFixed(2)}</div>
                </div>
              )}
            </div>
            {data?.budgetAmount && data.total > data.budgetAmount && (
              <div className="alert alert-danger mb-0 mt-2 py-1 px-2 small">
                <strong>Over Budget:</strong> Total spending (${data.total.toFixed(2)}) exceeds the{' '}
                {data.budgetPeriod === 'monthly' ? 'monthly' : 'annual'}{' '}
                {data.budgetSource === 'subcategory' ? 'subcategory' : 'category'} budget ($
                {data.budgetAmount.toFixed(2)}) by ${(data.total - data.budgetAmount).toFixed(2)}.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
