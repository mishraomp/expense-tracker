import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagBadge } from '@/components/tags/TagBadge';
import type { TagInfo } from '@/types/tag';

describe('TagBadge component', () => {
  const mockTag: TagInfo = {
    id: 'tag-1',
    name: 'Hardware',
    colorCode: '#FF5733',
  };

  const mockTagWithoutColor: TagInfo = {
    id: 'tag-2',
    name: 'NoColor',
    colorCode: null,
  };

  it('renders tag name', () => {
    render(<TagBadge tag={mockTag} />);
    expect(screen.getByText('Hardware')).toBeInTheDocument();
  });

  it('applies background color from tag colorCode', () => {
    render(<TagBadge tag={mockTag} />);
    const badge = screen.getByText('Hardware');
    expect(badge).toHaveStyle({ backgroundColor: '#FF5733' });
  });

  it('applies default gray color when colorCode is null', () => {
    render(<TagBadge tag={mockTagWithoutColor} />);
    const badge = screen.getByText('NoColor');
    expect(badge).toHaveStyle({ backgroundColor: '#6c757d' });
  });

  it('applies white text on dark background', () => {
    // Dark color (low luminance)
    const darkTag: TagInfo = { id: '1', name: 'Dark', colorCode: '#000000' };
    render(<TagBadge tag={darkTag} />);
    const badge = screen.getByText('Dark');
    expect(badge).toHaveStyle({ color: '#ffffff' });
  });

  it('applies black text on light background', () => {
    // Light color (high luminance)
    const lightTag: TagInfo = { id: '1', name: 'Light', colorCode: '#FFFFFF' };
    render(<TagBadge tag={lightTag} />);
    const badge = screen.getByText('Light');
    expect(badge).toHaveStyle({ color: '#000000' });
  });

  it('renders with sm size class by default', () => {
    render(<TagBadge tag={mockTag} />);
    const badge = screen.getByText('Hardware');
    expect(badge).toHaveClass('tag-badge--sm');
  });

  it('renders with md size class when specified', () => {
    render(<TagBadge tag={mockTag} size="md" />);
    const badge = screen.getByText('Hardware');
    expect(badge).toHaveClass('tag-badge--md');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<TagBadge tag={mockTag} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Hardware'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('adds clickable class when onClick provided', () => {
    const handleClick = vi.fn();
    render(<TagBadge tag={mockTag} onClick={handleClick} />);
    const badge = screen.getByText('Hardware');
    expect(badge).toHaveClass('tag-badge--clickable');
  });

  it('renders without remove button by default', () => {
    render(<TagBadge tag={mockTag} />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('renders remove button when onRemove provided', () => {
    const handleRemove = vi.fn();
    render(<TagBadge tag={mockTag} onRemove={handleRemove} />);
    expect(screen.getByRole('button', { name: /remove tag hardware/i })).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', () => {
    const handleRemove = vi.fn();
    render(<TagBadge tag={mockTag} onRemove={handleRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /remove tag hardware/i }));
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('stops propagation when remove button clicked', () => {
    const handleRemove = vi.fn();
    const handleClick = vi.fn();
    render(<TagBadge tag={mockTag} onClick={handleClick} onRemove={handleRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /remove tag hardware/i }));
    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles keyboard Enter for onClick', () => {
    const handleClick = vi.fn();
    render(<TagBadge tag={mockTag} onClick={handleClick} />);
    const badge = screen.getByText('Hardware');
    fireEvent.keyDown(badge, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard Space for onClick', () => {
    const handleClick = vi.fn();
    render(<TagBadge tag={mockTag} onClick={handleClick} />);
    const badge = screen.getByText('Hardware');
    fireEvent.keyDown(badge, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has role=button when clickable', () => {
    const handleClick = vi.fn();
    render(<TagBadge tag={mockTag} onClick={handleClick} />);
    const badge = screen.getByText('Hardware');
    expect(badge).toHaveAttribute('role', 'button');
    expect(badge).toHaveAttribute('tabIndex', '0');
  });
});
