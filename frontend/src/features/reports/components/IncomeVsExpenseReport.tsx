import { toYYYYMMDD } from '@/services/date';
import { useMemo, useState, useCallback } from 'react';
import { useIncomeVsExpense, useTotalBudget } from '../hooks/useReports';
import type { SubcategorySpendingByMonth } from '../types/reports.types';
import { IncomeVsExpenseChart } from './IncomeVsExpenseChart';
import SubcategoryBreakdownModal from './SubcategoryBreakdownModal';
// SubcategoryBreakdownChart is used inside `SubcategoryBreakdownModal`

export const IncomeVsExpenseReport = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Compute the start and end dates here so the report can't be filtered by arbitrary date,
  // only by year.
  const startDate = toYYYYMMDD(new Date(selectedYear, 0, 1));
  const endDate = toYYYYMMDD(new Date(selectedYear, 11, 31));

  const query = useIncomeVsExpense({ startDate, endDate });

  // Fetch total budget for the selected year directly from the budgets table
  const budgetQuery = useTotalBudget({ startDate, endDate });

  // Get the total budget value
  const totalBudget = budgetQuery.data?.totalBudget ?? 0;

  // Probable Savings = Income - Expenses - Total Budget
  const probableSavings = useMemo(() => {
    if (!query.data) return 0;
    return query.data.totalIncome - query.data.totalExpenses - totalBudget;
  }, [query.data, totalBudget]);

  // Keep hooks at top-level so the hook order never changes between renders
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const onMonthClick = useCallback((m: string) => setSelectedMonth(m), []);

  const yearOptions = (() => {
    const years: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 10; y--) {
      years.push(y);
    }
    return years;
  })();

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
      <div className="row align-items-end mb-3">
        <div className="col">
          <div className="small text-muted">Year</div>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setSelectedMonth(null);
            }}
            aria-label="Select report year"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row mb-2 ">
        {/* Make summary cards responsive: two columns on small screens, four on medium */}
        <div className="col-6 col-md-3 col-lg-2">
          <div className="card p-3">
            <div className="text-muted">Total Income ({selectedYear})</div>
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
            <div className="text-muted">Total Expenses ({selectedYear})</div>
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
            <div className="text-muted">Total Budget ({selectedYear})</div>
            <h5>
              $
              {totalBudget.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h5>
          </div>
        </div>
        <div className="col-6 col-md-3 col-lg-3">
          <div className="card p-3">
            <div className="text-muted">Probable Savings</div>
            <h5>
              $
              {probableSavings.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
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
