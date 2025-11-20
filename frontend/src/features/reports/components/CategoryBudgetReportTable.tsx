import type { CategoryBudgetReportRow } from '../types/reports.types';

export function CategoryBudgetReportTable({ rows }: { rows: CategoryBudgetReportRow[] }) {
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>Category</th>
            <th>Period</th>
            <th className="text-end">Budget</th>
            <th className="text-end">Spent</th>
            <th className="text-end">% Used</th>
            <th className="text-end">Remaining</th>
            <th className="text-center">Over Budget</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.categoryId}-${r.periodStart ?? 'na'}`}>
              <td>
                <span className="badge me-2" style={{ backgroundColor: r.colorCode ?? '#6c757d' }}>
                  &nbsp;
                </span>
                {r.categoryName}
              </td>
              <td>
                {r.periodStart && r.periodEnd ? `${r.periodStart} → ${r.periodEnd}` : '—'}
                {r.budgetPeriod ? ` (${r.budgetPeriod})` : ''}
              </td>
              <td className="text-end">{r.budgetAmount ?? '—'}</td>
              <td className="text-end">{r.totalSpent}</td>
              <td className="text-end">{r.percentUsed ?? '—'}</td>
              <td className="text-end">{r.remainingBudget ?? '—'}</td>
              <td className="text-center">
                {r.isOverBudget ? (
                  <span className="badge bg-danger">Yes</span>
                ) : (
                  <span className="badge bg-success">No</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-muted py-4">
                No data for selected filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
