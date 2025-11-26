import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { max } from 'd3-array';
// using toYYYYMMDD helper instead of human-readable timeFormat for consistent output
import { toYYYYMMDD } from '@/services/date';
import Decimal from 'decimal.js';
import type { BudgetVsActualPoint } from '../types/reports.types';

interface BudgetVsActualChartProps {
  data: BudgetVsActualPoint[];
}

export const BudgetVsActualChart = ({ data }: BudgetVsActualChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 400;
    const margin = { top: 20, right: 120, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    select(svgRef.current).selectAll('*').remove();

    const svg = select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-labelledby', 'budget-title budget-desc');

    svg.append('title').attr('id', 'budget-title').text('Budget vs Actual Spending');
    svg
      .append('desc')
      .attr('id', 'budget-desc')
      .text(`Grouped bar chart comparing budgeted vs actual spending for ${data.length} months`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const parsed = data.map((d) => ({
      month: new Date(d.bucket),
      budgeted: new Decimal(d.budgetAmount).toNumber(),
      actual: new Decimal(d.actualAmount).toNumber(),
      remaining: new Decimal(d.budgetAmount).minus(new Decimal(d.actualAmount)).toNumber(),
    }));

    const xScale = scaleBand()
      .domain(parsed.map((d) => toYYYYMMDD(d.month)))
      .range([0, innerWidth])
      .padding(0.2);

    const yMax = max(parsed, (d) => Math.max(d.budgeted, d.actual)) || 0;
    const yScale = scaleLinear()
      .domain([0, yMax * 1.1])
      .range([innerHeight, 0]);

    const xAxis = axisBottom(xScale);
    const yAxis = axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `$${d}`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    g.append('g').call(yAxis);

    const barWidth = xScale.bandwidth() / 2;

    parsed.forEach((d) => {
      const x = xScale(toYYYYMMDD(d.month))!;

      g.append('rect')
        .attr('x', x)
        .attr('y', yScale(d.budgeted))
        .attr('width', barWidth)
        .attr('height', innerHeight - yScale(d.budgeted))
        .attr('fill', '#5F27CD')
        .attr('tabindex', 0)
        .attr('role', 'listitem')
        .append('title')
        .text(`Budgeted (${toYYYYMMDD(d.month)}): $${d.budgeted.toFixed(2)}`);

      const actualColor = d.actual > d.budgeted ? '#FF6348' : '#1DD1A1';
      g.append('rect')
        .attr('x', x + barWidth)
        .attr('y', yScale(d.actual))
        .attr('width', barWidth)
        .attr('height', innerHeight - yScale(d.actual))
        .attr('fill', actualColor)
        .attr('tabindex', 0)
        .attr('role', 'listitem')
        .append('title')
        .text(
          `Actual (${toYYYYMMDD(d.month)}): $${d.actual.toFixed(2)} (${d.remaining >= 0 ? 'Under' : 'Over'} by $${Math.abs(
            d.remaining,
          ).toFixed(2)})`,
        );
    });

    const legend = svg
      .append('g')
      .attr('transform', `translate(${width - 110}, 20)`)
      .attr('role', 'list')
      .attr('aria-label', 'Chart legend');

    const legendData = [
      { label: 'Budgeted', color: '#5F27CD' },
      { label: 'Under Budget', color: '#1DD1A1' },
      { label: 'Over Budget', color: '#FF6348' },
    ];

    legendData.forEach((item, i) => {
      const legendItem = legend.append('g').attr('transform', `translate(0, ${i * 25})`);
      legendItem.append('rect').attr('width', 18).attr('height', 18).attr('fill', item.color);
      legendItem
        .append('text')
        .attr('x', 24)
        .attr('y', 9)
        .attr('dy', '0.35em')
        .style('font-size', '0.75rem')
        .text(item.label);
    });
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No budget data available for the selected range.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="chart-container">
      <svg ref={svgRef} className="chart-svg"></svg>
    </div>
  );
};
