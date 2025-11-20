import { select } from 'd3-selection';
import { arc, pie } from 'd3-shape';
import type { PieArcDatum } from 'd3-shape';
import Decimal from 'decimal.js';
import { useEffect, useRef } from 'react';
import type { SubcategoryBreakdownItem } from '../types/reports.types';

type PieData = {
  subcategory: string;
  category: string;
  amount: number;
  percentage: number;
  color: string;
};

interface SubcategoryBreakdownChartProps {
  data: SubcategoryBreakdownItem[];
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

export const SubcategoryBreakdownChart = ({ data }: SubcategoryBreakdownChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.max(500, Math.min(container.clientHeight || 600, 700));
    const legendWidth = 400; // Space for legend
    const chartWidth = width > 1000 ? width - legendWidth : width;
    const radius = Math.min(chartWidth, height) / 2 - 40;

    select(svgRef.current).selectAll('*').remove();

    const svg = select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-labelledby', 'pie-title pie-desc');

    svg.append('title').attr('id', 'pie-title').text('Spending by Subcategory');
    svg
      .append('desc')
      .attr('id', 'pie-desc')
      .text(`Pie chart showing spending distribution across ${data.length} subcategories`);

    const chartCenterX = width > 1000 ? chartWidth / 2 : width / 2;
    const g = svg.append('g').attr('transform', `translate(${chartCenterX},${height / 2})`);

    const parsed = data.map((d, i) => ({
      subcategory: d.subcategoryName,
      category: d.categoryName,
      amount: new Decimal(d.amount).toNumber(),
      // Always assign a unique color per subcategory — prefer palette by index
      // If there are more subcategories than colors, generate additional hues.
      color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] || `hsl(${(i * 137.5) % 360} 75% 47%)`,
    }));

    const total = parsed.reduce((sum, item) => sum + item.amount, 0);

    const parsedWithPercentage = parsed.map((d) => ({
      ...d,
      percentage: total > 0 ? (d.amount / total) * 100 : 0,
    }));

    // Reuse PieData defined in module scope to avoid TSX generic parsing issues

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
          `${d.data.subcategory} (${d.data.category}): $${d.data.amount.toFixed(2)} (${d.data.percentage.toFixed(1)}%)`,
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

    const legend = svg.append('g').attr('role', 'list').attr('aria-label', 'Subcategory legend');
    if (width > 1000) {
      // Desktop: show legend to the right with more space
      legend.attr('transform', `translate(${chartWidth + 30}, 60)`);
    } else {
      // Small screens: show below chart
      legend.attr('transform', `translate(10, ${height + 20})`);
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
      .style('font-size', '11px')
      .text(
        (d) =>
          `${d.subcategory} (${d.category}): $${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${d.percentage.toFixed(1)}%)`,
      );
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No subcategory spending data available for the selected range.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }}></svg>
    </div>
  );
};
