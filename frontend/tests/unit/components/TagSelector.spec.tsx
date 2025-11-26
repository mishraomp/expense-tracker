import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagSelector } from '@/components/tags/TagSelector';
import type { Tag } from '@/types/tag';

describe('TagSelector component', () => {
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
    render(<TagSelector tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);
    expect(screen.getByText('Select tags...')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    render(
      <TagSelector
        tags={mockTags}
        selectedTagIds={[]}
        onChange={() => {}}
        placeholder="Choose tags..."
      />,
    );
    expect(screen.getByText('Choose tags...')).toBeInTheDocument();
  });

  it('renders selected tags as badges', () => {
    render(<TagSelector tags={mockTags} selectedTagIds={['tag-1', 'tag-2']} onChange={() => {}} />);
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(<TagSelector tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows available (unselected) tags in dropdown', () => {
    render(<TagSelector tags={mockTags} selectedTagIds={['tag-1']} onChange={() => {}} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Should show unselected tags
    expect(screen.getByRole('option', { name: /groceries/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /entertainment/i })).toBeInTheDocument();
  });

  it('calls onChange when selecting a tag', () => {
    const handleChange = vi.fn();
    render(<TagSelector tags={mockTags} selectedTagIds={[]} onChange={handleChange} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Click on a tag option
    const option = screen.getByRole('option', { name: /hardware/i });
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith(['tag-1']);
  });

  it('calls onChange when removing a selected tag', () => {
    const handleChange = vi.fn();
    render(
      <TagSelector tags={mockTags} selectedTagIds={['tag-1', 'tag-2']} onChange={handleChange} />,
    );

    // Find and click remove button for Hardware tag
    const removeButton = screen.getByRole('button', { name: /remove tag hardware/i });
    fireEvent.click(removeButton);

    expect(handleChange).toHaveBeenCalledWith(['tag-2']);
  });

  it('filters tags by search term', () => {
    render(<TagSelector tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'hard' } });

    // Only Hardware should match
    expect(screen.getByRole('option', { name: /hardware/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /groceries/i })).not.toBeInTheDocument();
  });

  it('shows "No matching tags" when search has no results', () => {
    render(<TagSelector tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No matching tags')).toBeInTheDocument();
  });

  it('shows "No more tags available" when all tags are selected', () => {
    render(
      <TagSelector
        tags={mockTags}
        selectedTagIds={['tag-1', 'tag-2', 'tag-3']}
        onChange={() => {}}
      />,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    expect(screen.getByText('No more tags available')).toBeInTheDocument();
  });

  it('shows create option when onCreateTag provided and search has no matches', () => {
    const handleCreate = vi.fn();
    render(
      <TagSelector
        tags={mockTags}
        selectedTagIds={[]}
        onChange={() => {}}
        onCreateTag={handleCreate}
      />,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'NewTag' } });

    expect(screen.getByText(/create "newtag"/i)).toBeInTheDocument();
  });

  it('calls onCreateTag when create option clicked', () => {
    const handleCreate = vi.fn();
    render(
      <TagSelector
        tags={mockTags}
        selectedTagIds={[]}
        onChange={() => {}}
        onCreateTag={handleCreate}
      />,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'NewTag' } });

    const createOption = screen.getByText(/create "newtag"/i);
    fireEvent.click(createOption);

    expect(handleCreate).toHaveBeenCalledWith('NewTag');
  });

  it('calls onCreateTag when Enter pressed with new tag name', () => {
    const handleCreate = vi.fn();
    render(
      <TagSelector
        tags={mockTags}
        selectedTagIds={[]}
        onChange={() => {}}
        onCreateTag={handleCreate}
      />,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.change(searchInput, { target: { value: 'NewTag' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(handleCreate).toHaveBeenCalledWith('NewTag');
  });

  it('closes dropdown on Escape key', () => {
    render(<TagSelector tags={mockTags} selectedTagIds={[]} onChange={() => {}} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const searchInput = screen.getByPlaceholderText('Search tags...');
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not open dropdown when disabled', () => {
    render(<TagSelector tags={mockTags} selectedTagIds={[]} onChange={() => {}} disabled />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not show remove buttons when disabled', () => {
    render(<TagSelector tags={mockTags} selectedTagIds={['tag-1']} onChange={() => {}} disabled />);

    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove tag hardware/i })).not.toBeInTheDocument();
  });

  it('shows loading spinner when isLoading', () => {
    render(<TagSelector tags={mockTags} selectedTagIds={[]} onChange={() => {}} isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
