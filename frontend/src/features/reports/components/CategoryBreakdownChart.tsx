import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { arc, pie } from 'd3-shape';
import type { PieArcDatum } from 'd3-shape';

type PieData = {
  category: string;
  amount: number;
  percentage: number;
  color: string;
};
import Decimal from 'decimal.js';
import type { CategoryBreakdownItem } from '../types/reports.types';

interface CategoryBreakdownChartProps {
  data: CategoryBreakdownItem[];
}

const DEFAULT_COLORS = [
  '#5F27CD',
  '#00D2D3',
  '#FF9FF3',
  '#54A0FF',
  '#48DBFB',
  '#1DD1A1',
  '#F368E0',
  '#FF6348',
  '#FFA502',
  '#FFDD59',
];

export const CategoryBreakdownChart = ({ data }: CategoryBreakdownChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    select(svgRef.current).selectAll('*').remove();

    const svg = select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-labelledby', 'pie-title pie-desc');

    svg.append('title').attr('id', 'pie-title').text('Spending by Category');
    svg
      .append('desc')
      .attr('id', 'pie-desc')
      .text(`Pie chart showing spending distribution across ${data.length} categories`);

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    const parsed = data.map((d, i) => ({
      category: d.categoryName,
      amount: new Decimal(d.amount).toNumber(),
      color: d.colorCode || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }));

    const total = parsed.reduce((sum, item) => sum + item.amount, 0);

    const parsedWithPercentage = parsed.map((d) => ({
      ...d,
      percentage: total > 0 ? (d.amount / total) * 100 : 0,
    }));

    // Use PieData defined in module scope

    const pieGenerator = pie<PieData>()
      .value((d) => d.amount)
      .sort(null);

    const arcGenerator = arc<PieArcDatum<PieData>>().innerRadius(0).outerRadius(radius);
    const labelArc = arc<PieArcDatum<PieData>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.6);

    const paths = g
      .selectAll('path')
      .data(pieGenerator(parsedWithPercentage))
      .enter()
      .append('path')
      .attr('d', arcGenerator)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('tabindex', 0)
      .attr('role', 'listitem');

    paths
      .append('title')
      .text(
        (d) =>
          `${d.data.category}: $${d.data.amount.toFixed(2)} (${d.data.percentage.toFixed(1)}%)`,
      );

    // Add amount labels inside slices
    g.selectAll('text.slice-label')
      .data(pieGenerator(parsedWithPercentage))
      .enter()
      .append('text')
      .attr('class', 'slice-label')
      .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text((d) => (d.data.percentage > 5 ? `$${Math.round(d.data.amount).toLocaleString()}` : ''));

    const legend = svg.append('g').attr('role', 'list').attr('aria-label', 'Category legend');
    if (width > 600) {
      legend.attr('transform', `translate(${width - 150}, 20)`);
    } else {
      legend.attr('transform', `translate(10, ${height - 60})`).style('display', 'none');
    }

    const legendItems = legend
      .selectAll('g')
      .data(parsedWithPercentage)
      .enter()
      .append('g')
      .attr('transform', (_d, i) => `translate(0, ${i * 25})`);

    legendItems
      .append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .attr('fill', (d) => d.color);

    legendItems
      .append('text')
      .attr('x', 24)
      .attr('y', 9)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .text((d) => `${d.category} (${d.percentage.toFixed(1)}%)`);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No spending data available for the selected range.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }}></svg>
    </div>
  );
};
