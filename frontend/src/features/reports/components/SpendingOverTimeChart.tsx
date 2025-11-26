import { toYYYYMMDD } from '@/services/date';
import { extent, max } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear, scaleTime } from 'd3-scale';
import { select } from 'd3-selection';
import { curveMonotoneX, line } from 'd3-shape';
import { timeFormat } from 'd3-time-format';
import Decimal from 'decimal.js';
import { useEffect, useRef } from 'react';
import type { SpendingOverTimePoint } from '../types/reports.types';

interface SpendingOverTimeChartProps {
  data: SpendingOverTimePoint[];
  interval: 'day' | 'week' | 'month';
}

export const SpendingOverTimeChart = ({ data, interval }: SpendingOverTimeChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous
    select(svgRef.current).selectAll('*').remove();

    const svg = select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-labelledby', 'chart-title chart-desc');

    svg.append('title').attr('id', 'chart-title').text('Spending Over Time');
    svg
      .append('desc')
      .attr('id', 'chart-desc')
      .text(
        `Line chart showing spending from ${data[0].bucket} to ${data[data.length - 1].bucket}`,
      );

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse data
    const parsed = data.map((d) => ({
      date: new Date(d.bucket),
      amount: new Decimal(d.amount).toNumber(),
    }));

    // Scales
    const xExtent = extent(parsed, (d) => d.date) as [Date, Date];
    const xScale = scaleTime().domain(xExtent).range([0, innerWidth]);

    const yMax = max(parsed, (d) => d.amount) || 0;
    const yScale = scaleLinear()
      .domain([0, yMax * 1.1])
      .range([innerHeight, 0]);

    // Axes - keep labels in yyyy-mm-dd format to be consistent across the UI
    const tickFormatFn = timeFormat('%Y-%m-%d');
    // axisBottom type expects domain values which may be Date | NumberValue;
    // explicitly provide Date generic and cast inside tickFormat to satisfy types
    const xAxis = axisBottom<Date>(xScale)
      .ticks(6)
      .tickFormat((d) => tickFormatFn(d as Date));
    const yAxis = axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `$${d}`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      // d3's selection.call typing can be strict; cast the axis to any to avoid TS errors
      /* eslint-disable @typescript-eslint/no-explicit-any */
      .call(xAxis as any)
      /* eslint-enable @typescript-eslint/no-explicit-any */
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    /* eslint-disable @typescript-eslint/no-explicit-any */
    g.append('g').call(yAxis as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Line generator
    const lineGenerator = line<{ date: Date; amount: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.amount))
      .curve(curveMonotoneX);

    // Draw line
    g.append('path')
      .datum(parsed)
      .attr('fill', 'none')
      .attr('stroke', '#5F27CD')
      .attr('stroke-width', 2)
      .attr('d', lineGenerator);

    // Draw points
    g.selectAll('circle')
      .data(parsed)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.amount))
      .attr('r', 4)
      .attr('fill', '#5F27CD')
      .attr('tabindex', 0)
      .attr('role', 'listitem')
      .append('title')
      .text((d) => `${toYYYYMMDD(d.date)}: $${d.amount.toFixed(2)}`);
  }, [data, interval]);

  if (data.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No data available for the selected range.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="chart-container">
      <svg ref={svgRef} className="chart-svg"></svg>
    </div>
  );
};
