import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagFilterSelect } from '@/components/tags/TagFilterSelect';
import type { Tag } from '@/types/tag';

describe('TagFilterSelect component', () => {
  const mockTags: Tag[] = [
    {
      id: 'tag-1',
      name: 'Hardware',
      colorCode: '#FF5733',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'tag-2',
      name: 'Groceries',
      colorCode: '#00FF00',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'tag-3',
      name: 'Entertainment',
      colorCode: '#0000FF',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
  ];

  it('renders placeholder when no tags selected', () => {
    render(<TagFilterSelect tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);
    expect(screen.getByText('Filter by tag...')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    render(
      <TagFilterSelect
        tags={mockTags}
        selectedTagIds={[]}
        onChange={() => {}}
        placeholder="Select tags..."
      />,
    );
    expect(screen.getByText('Select tags...')).toBeInTheDocument();
  });

  it('renders selected tags as badges', () => {
    render(
      <TagFilterSelect tags={mockTags} selectedTagIds={['tag-1', 'tag-2']} onChange={() => {}} />,
    );
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('shows all selected tags as pills below trigger', () => {
    render(
      <TagFilterSelect
        tags={mockTags}
        selectedTagIds={['tag-1', 'tag-2', 'tag-3']}
        onChange={() => {}}
      />,
    );
    // All 3 tags should be visible as pills
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    // Trigger should show count
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(<TagFilterSelect tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows available (unselected) tags in dropdown', () => {
    render(<TagFilterSelect tags={mockTags} selectedTagIds={['tag-1']} onChange={() => {}} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Should show unselected tags
    expect(screen.getByRole('option', { name: /groceries/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /entertainment/i })).toBeInTheDocument();
  });

  it('calls onChange when selecting a tag', () => {
    const handleChange = vi.fn();
    render(<TagFilterSelect tags={mockTags} selectedTagIds={[]} onChange={handleChange} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const option = screen.getByRole('option', { name: /hardware/i });
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith(['tag-1']);
  });

  it('calls onChange with tag removed when removing a selected tag', () => {
    const handleChange = vi.fn();
    render(
      <TagFilterSelect
        tags={mockTags}
        selectedTagIds={['tag-1', 'tag-2']}
        onChange={handleChange}
      />,
    );

    const removeButton = screen.getByRole('button', { name: /remove tag hardware/i });
    fireEvent.click(removeButton);

    expect(handleChange).toHaveBeenCalledWith(['tag-2']);
  });

  it('filters tags by search term', () => {
    render(<TagFilterSelect tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'hard' } });

    expect(screen.getByRole('option', { name: /hardware/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /groceries/i })).not.toBeInTheDocument();
  });

  it('shows "No matching tags" when search has no results', () => {
    render(<TagFilterSelect tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No matching tags')).toBeInTheDocument();
  });

  it('shows "No more tags" when all tags are selected', () => {
    render(
      <TagFilterSelect
        tags={mockTags}
        selectedTagIds={['tag-1', 'tag-2', 'tag-3']}
        onChange={() => {}}
      />,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    expect(screen.getByText('No more tags')).toBeInTheDocument();
  });

  it('clears all tags when clear button clicked', () => {
    const handleChange = vi.fn();
    render(
      <TagFilterSelect
        tags={mockTags}
        selectedTagIds={['tag-1', 'tag-2']}
        onChange={handleChange}
      />,
    );

    const clearButton = screen.getByRole('button', { name: /clear all tags/i });
    fireEvent.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('closes dropdown on Escape key', () => {
    render(<TagFilterSelect tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not open dropdown when disabled', () => {
    render(<TagFilterSelect tags={mockTags} selectedTagIds={[]} onChange={() => {}} disabled />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows footer with count and clear all link when tags selected', () => {
    render(
      <TagFilterSelect tags={mockTags} selectedTagIds={['tag-1', 'tag-2']} onChange={() => {}} />,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Count appears in both trigger and footer, so use getAllByText
    const selectedTexts = screen.getAllByText('2 selected');
    expect(selectedTexts.length).toBeGreaterThanOrEqual(1);
    // Footer has a "Clear all" text button (different from the × button)
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });
});
