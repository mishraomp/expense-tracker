import { toYYYYMMDD } from '@/services/date';
import { useMemo, useState, useCallback } from 'react';
import { useIncomeVsExpense } from '../hooks/useReports';
import type { SubcategorySpendingByMonth } from '../types/reports.types';
import { IncomeVsExpenseChart } from './IncomeVsExpenseChart';
import SubcategoryBreakdownModal from './SubcategoryBreakdownModal';
// SubcategoryBreakdownChart is used inside `SubcategoryBreakdownModal`

export const IncomeVsExpenseReport = () => {
  // Income vs Expense should always show the current year's months up to today.
  // Compute the start and end dates here so the report can't be filtered by date.
  const today = new Date();
  const thisYearStart = new Date(today.getFullYear(), 0, 1);
  const startDate = toYYYYMMDD(thisYearStart);
  const endDate = toYYYYMMDD(today);

  const query = useIncomeVsExpense({ startDate, endDate });

  // Keep hooks at top-level so the hook order never changes between renders
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const onMonthClick = useCallback((m: string) => setSelectedMonth(m), []);

  const subcategoryForMonth = useMemo(() => {
    if (!selectedMonth || !query.data?.expensesBySubcategoryByMonth) return [];
    return (query.data.expensesBySubcategoryByMonth || [])
      .filter((r: SubcategorySpendingByMonth) => r.month === selectedMonth)
      .map((r) => ({
        subcategoryId: r.subcategoryId,
        subcategoryName: r.subcategoryName,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        colorCode: r.colorCode ?? null,
        amount: r.amount.toString(),
      }));
  }, [query.data, selectedMonth]);

  if (query.isLoading) {
    return (
      <div className="d-flex justify-content-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="alert alert-danger" role="alert">
        Error loading report: {query.error?.message || 'Unknown error'}
      </div>
    );
  }

  if (!query.data) {
    return null;
  }

  return (
    <>
      <div className="row mb-2 ">
        {/* Make summary cards responsive: two columns on small screens, four on medium */}
        <div className="col-6 col-md-3 col-lg-2">
          <div className="card p-3">
            <div className="text-muted">Total Income (year)</div>
            <h5>
              $
              {query.data.totalIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h5>
          </div>
        </div>
        <div className="col-6 col-md-3 col-lg-2">
          <div className="card p-3">
            <div className="text-muted">Total Expenses (year)</div>
            <h5>
              $
              {query.data.totalExpenses.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h5>
          </div>
        </div>
        <div className="col-6 col-md-3 col-lg-3">
          <div className="card p-3">
            <div className="text-muted">Net Savings</div>
            <h5>
              $
              {query.data.netSavings.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h5>
          </div>
        </div>
        <div className="col-6 col-md-3 col-lg-3">
          <div className="card p-3">
            <div className="text-muted">Savings Rate</div>
            <h5>
              {query.data.savingsRate.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              %
            </h5>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {/* Chart container — swap between bar chart and pie chart when a month is selected */}
          <div className="report-chart-container min-h-22">
            <IncomeVsExpenseChart report={query.data} onMonthClick={onMonthClick} />
          </div>
          <SubcategoryBreakdownModal
            isOpen={Boolean(selectedMonth)}
            data={subcategoryForMonth}
            month={selectedMonth}
            onClose={() => setSelectedMonth(null)}
          />
          {!selectedMonth && (
            <div className="small text-muted mt-2">
              Click a month to view expense breakdown by subcategory.
            </div>
          )}
          {/* NOTE: selectedMonth's breakdown appears inline above. Delete the bottom pane. */}
        </div>
      </div>
    </>
  );
};
