import { useState } from 'react';
import { toYYYYMMDD } from '@/services/date';
import { SpendingOverTimeChart } from '../components/SpendingOverTimeChart';
import { CategoryBreakdownChart } from '../components/CategoryBreakdownChart';
import { SubcategoryBreakdownChart } from '../components/SubcategoryBreakdownChart';
import {
  useSpendingOverTime,
  useSpendingByCategory,
  useSpendingBySubcategory,
  useCategoryBudgetReport,
  useSubcategoryBudgetReport,
  // useIncomeVsExpense imported in child report component
} from '../hooks/useReports';
import { CategoryBudgetReportTable, SubcategoryBudgetReportTable } from '../components';
import { IncomeVsExpenseReport } from '../components/IncomeVsExpenseReport';

type ReportType =
  | 'spending-over-time'
  | 'spending-by-category'
  | 'spending-by-subcategory'
  | 'category-budget'
  | 'subcategory-budget'
  | 'income-vs-expense';

export const ReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('spending-over-time');

  // Removed old per-report default logic; we unify to Jan 1 -> Today

  // On initial load, default to Jan 1 of current year -> today
  const todayInit = new Date();
  const initialStart = toYYYYMMDD(new Date(todayInit.getFullYear(), 0, 1));
  const initialEnd = toYYYYMMDD(todayInit);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('month');

  const handleClearFilters = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    setStartDate(toYYYYMMDD(start));
    setEndDate(toYYYYMMDD(today));
  };

  // Update date range when report type changes: reset to Jan 1 -> Today
  const handleReportChange = (reportType: ReportType) => {
    setSelectedReport(reportType);
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    setStartDate(toYYYYMMDD(start));
    setEndDate(toYYYYMMDD(today));
  };

  const spendingQuery = useSpendingOverTime({ startDate, endDate, interval });
  const categoryQuery = useSpendingByCategory({ startDate, endDate });
  const subcategoryQuery = useSpendingBySubcategory({ startDate, endDate });
  const catBudgetReport = useCategoryBudgetReport({});
  const subcatBudgetReport = useSubcategoryBudgetReport({});

  return (
    <div className="py-2 reports-page">
      <div className="row align-items-center mb-3">
        <div className="col">
          <h1 className="h3 mb-1">Reports & Analytics</h1>
          <p className="text-muted small mb-0">View and analyze your income and spending.</p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Report Selection</h5>
          <div className="row g-3 mb-3">
            <div className="col-md-12">
              <label htmlFor="reportType" className="form-label">
                Select Report
              </label>
              <select
                id="reportType"
                className="form-select"
                value={selectedReport}
                onChange={(e) => handleReportChange(e.target.value as ReportType)}
              >
                <option value="spending-over-time">Spending Over Time</option>
                <option value="spending-by-category">Spending by Category</option>
                <option value="spending-by-subcategory">Spending by Subcategory</option>
                <option value="category-budget">Category Budget Report</option>
                <option value="subcategory-budget">Subcategory Budget Report</option>
                <option value="income-vs-expense">Income vs Expense</option>
              </select>
            </div>
          </div>

          {(selectedReport === 'spending-over-time' ||
            selectedReport === 'spending-by-category' ||
            selectedReport === 'spending-by-subcategory') && (
            <>
              <h5 className="card-title">Date Range & Options</h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <label htmlFor="startDate" className="form-label">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="endDate" className="form-label">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {selectedReport === 'spending-over-time' && (
                  <div className="col-md-4">
                    <label htmlFor="interval" className="form-label">
                      Time Interval
                    </label>
                    <select
                      id="interval"
                      className="form-select"
                      value={interval}
                      onChange={(e) => setInterval(e.target.value as 'day' | 'week' | 'month')}
                    >
                      <option value="day">Daily</option>
                      <option value="week">Weekly</option>
                      <option value="month">Monthly</option>
                    </select>
                  </div>
                )}
                <div className="col-12 d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleClearFilters}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedReport === 'spending-over-time' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Spending Over Time</h5>
            {spendingQuery.isLoading && (
              <div className="d-flex justify-content-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {spendingQuery.isError && (
              <div className="alert alert-danger" role="alert">
                Error loading spending data: {spendingQuery.error?.message || 'Unknown error'}
              </div>
            )}
            {spendingQuery.isSuccess && (
              <SpendingOverTimeChart data={spendingQuery.data.data} interval={interval} />
            )}
          </div>
        </div>
      )}

      {selectedReport === 'spending-by-category' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Spending by Category</h5>
            {categoryQuery.isLoading && (
              <div className="d-flex justify-content-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {categoryQuery.isError && (
              <div className="alert alert-danger" role="alert">
                Error loading category data: {categoryQuery.error?.message || 'Unknown error'}
              </div>
            )}
            {categoryQuery.isSuccess && <CategoryBreakdownChart data={categoryQuery.data} />}
          </div>
        </div>
      )}

      {selectedReport === 'spending-by-subcategory' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Spending by Subcategory</h5>
            {subcategoryQuery.isLoading && (
              <div className="d-flex justify-content-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {subcategoryQuery.isError && (
              <div className="alert alert-danger" role="alert">
                Error loading subcategory data: {subcategoryQuery.error?.message || 'Unknown error'}
              </div>
            )}
            {subcategoryQuery.isSuccess && (
              <SubcategoryBreakdownChart data={subcategoryQuery.data} />
            )}
          </div>
        </div>
      )}

      {selectedReport === 'income-vs-expense' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Income vs Expense (monthly)</h5>
            {/* fetch the report */}
            {/* lazy load: only when selected */}
            <IncomeVsExpenseReport />
          </div>
        </div>
      )}

      {selectedReport === 'category-budget' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Category Budget Report</h5>
            {catBudgetReport.isLoading && (
              <div className="d-flex justify-content-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {catBudgetReport.isError && (
              <div className="alert alert-danger" role="alert">
                Error loading category budget: {catBudgetReport.error?.message || 'Unknown error'}
              </div>
            )}
            {catBudgetReport.isSuccess && <CategoryBudgetReportTable rows={catBudgetReport.data} />}
          </div>
        </div>
      )}

      {selectedReport === 'subcategory-budget' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Subcategory Budget Report</h5>
            {subcatBudgetReport.isLoading && (
              <div className="d-flex justify-content-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {subcatBudgetReport.isError && (
              <div className="alert alert-danger" role="alert">
                Error loading subcategory budget:{' '}
                {subcatBudgetReport.error?.message || 'Unknown error'}
              </div>
            )}
            {subcatBudgetReport.isSuccess && (
              <SubcategoryBudgetReportTable rows={subcatBudgetReport.data} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
