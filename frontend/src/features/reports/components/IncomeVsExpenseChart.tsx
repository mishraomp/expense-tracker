import { max } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
/* using direct YYYY-MM strings; no timeFormat needed */
import { useEffect, useMemo, useRef } from 'react';
import type { IncomeVsExpenseResponse, SubcategorySpendingByMonth } from '../types/reports.types';

interface IncomeVsExpenseChartProps {
  report: IncomeVsExpenseResponse;
  onMonthClick?: (month: string) => void;
}

export const IncomeVsExpenseChart = ({ report, onMonthClick }: IncomeVsExpenseChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prepare data for stacking
  const prepared = useMemo(() => {
    if (!report) return { months: [], keys: [], rows: [], subcats: [] };

    const months = [...report.incomeByMonth].map((m) => m.month).sort();

    // map month -> { subcategory id -> amount }
    const map: Record<string, Record<string, number>> = {};
    const subcatMap: Record<string, SubcategorySpendingByMonth> = {};

    (report.expensesBySubcategoryByMonth || []).forEach((r) => {
      map[r.month] = map[r.month] ?? {};
      map[r.month][r.subcategoryId] = (map[r.month][r.subcategoryId] || 0) + r.amount;
      subcatMap[r.subcategoryId] = {
        month: r.month,
        subcategoryId: r.subcategoryId,
        subcategoryName: r.subcategoryName,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        colorCode: r.colorCode,
        amount: r.amount,
      };
    });

    // All unique subcategories
    const keys = Object.keys(subcatMap);

    const rows = months.map((m) => {
      const row: Record<string, number | string> = { month: m, income: 0 };
      const monthIncome = report.incomeByMonth.find((x) => x.month === m);
      row.income = monthIncome?.income || 0;
      keys.forEach((k) => {
        row[k] = map[m]?.[k] || 0;
      });
      return row;
    });

    return { months, keys, rows, subcats: Object.values(subcatMap) };
  }, [report]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !report) return;
    const width = containerRef.current.clientWidth;
    const height = 450;
    const margin = { top: 40, right: 40, bottom: 80, left: 80 };

    // clear
    select(svgRef.current).selectAll('*').remove();

    const svg = select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Use string domain (YYYY-MM) so we avoid Date parsing timezone issues.
    const months = prepared.months;

    if (months.length === 0) {
      g.append('text')
        .text('No data')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2);
      return;
    }

    const xScale = scaleBand<string>().domain(months).range([0, innerWidth]).padding(0.2);

    // compute totals per month
    const incomeMap = new Map(prepared.rows.map((r) => [r.month, r.income]));
    const expenseMap = new Map(
      prepared.rows.map((r) => [r.month, prepared.keys.reduce((s, k) => s + Number(r[k] || 0), 0)]),
    );

    const maxIncome = max(prepared.rows, (r) => Number(r.income)) || 0;
    const maxExpense =
      max(prepared.rows, (r) => prepared.keys.reduce((s, k) => s + Number(r[k] || 0), 0)) || 0;
    const yMax = Math.max(maxExpense, maxIncome) * 1.3;

    const yScale = scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    // axes
    const xAxis = axisBottom(xScale)
      .ticks(prepared.months.length)
      .tickFormat((d: string) => d);
    const yAxis = axisLeft(yScale)
      .ticks(5)
      .tickFormat((v) => `$${v}`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    g.append('g').call(yAxis);

    // draw grouped bars: expense (red) and income (green)

    // group width and offsets
    const band = xScale.bandwidth();
    const barWidth = Math.max(6, band / 3);
    const offset = (band - barWidth * 2) / 2;

    const monthData = prepared.months.map((m) => ({
      month: m,
      income: incomeMap.get(m) || 0,
      expense: expenseMap.get(m) || 0,
    }));

    const groups = g
      .append('g')
      .selectAll('g.month-group')
      .data(monthData)
      .enter()
      .append('g')
      .attr('class', 'month-group')
      .style('cursor', 'pointer');

    // expense bar (red)
    groups
      .append('rect')
      .attr('x', (d) => (xScale(d.month) as number)! + offset)
      .attr('y', (d) => yScale(Number(d.expense)))
      .attr('width', barWidth)
      .attr('height', (d) => innerHeight - yScale(Number(d.expense)))
      .attr('fill', '#ff4136')
      .attr('tabindex', 0)
      .attr('role', 'listitem')
      .on('click', (_ev, d) => onMonthClick?.(d.month))
      .append('title')
      .text((d) => `Expenses: $${Number(d.expense).toFixed(2)} (${d.month})`);

    // income bar (green)
    groups
      .append('rect')
      .attr('x', (d) => (xScale(d.month) as number)! + offset + barWidth)
      .attr('y', (d) => yScale(Number(d.income)))
      .attr('width', barWidth)
      .attr('height', (d) => innerHeight - yScale(Number(d.income)))
      .attr('fill', '#2ecc71')
      .append('title')
      .text((d) => `Income: $${Number(d.income).toFixed(2)} (${d.month})`);

    // Also allow clicking anywhere within the month group to view breakdown
    groups.on('click', (_ev, d) => onMonthClick?.(d.month));

    // Note: income is now shown as the green bar. Additional overlays removed.

    // legend for income / expense (top-left)
    const legend = svg.append('g').attr('transform', `translate(${margin.left},10)`);
    const legendSpacing = innerWidth < 520 ? 80 : 140;
    const legendItems = legend
      .selectAll('g')
      .data([
        { label: 'Expenses', color: '#ff4136' },
        { label: 'Income', color: '#2ecc71' },
      ])
      .enter()
      .append('g')
      .attr('transform', (_d, i) => `translate(${i * legendSpacing}, 0)`)
      .style('display', innerWidth < 420 ? 'none' : 'block');

    legendItems
      .append('rect')
      .attr('width', 16)
      .attr('height', 16)
      .attr('fill', (d) => d.color);
    legendItems
      .append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text((d) => d.label)
      .style('font-size', innerWidth < 420 ? '0.625rem' : '0.75rem');
  }, [report, prepared, onMonthClick]);

  if (!report || report.incomeByMonth.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No income/expense data available for the selected range.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="chart-container">
      <svg ref={svgRef} className="chart-svg"></svg>
    </div>
  );
};
