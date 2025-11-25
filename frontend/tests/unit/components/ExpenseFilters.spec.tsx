import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import ExpenseFilters from '@/features/expenses/components/ExpenseFilters';
import { useCategories } from '@/features/expenses/api/categoryApi';
import { useSubcategories } from '@/features/expenses/api/subcategoryApi';

vi.mock('@/features/expenses/api/categoryApi', () => ({
  useCategories: vi.fn(() => ({ data: [{ id: 'cat-1', name: 'Cat 1' }] })),
}));

vi.mock('@/features/expenses/api/subcategoryApi', () => ({
  useSubcategories: vi.fn(() => ({ data: [{ id: 'sub-1', name: 'Sub 1', categoryId: 'cat-1' }] })),
}));

describe('ExpenseFilters component', () => {
  it('renders and fires onChange on input changes', async () => {
    const onChange = vi.fn();
    render(<ExpenseFilters onChange={onChange} />);

    // Select a category
    const categorySelect = screen.getByLabelText('Filter by category');
    fireEvent.change(categorySelect, { target: { value: 'cat-1' } });
    // The onChange is debounced for 300ms; wait and assert using waitFor
    await waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 1000 });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.categoryId).toBe('cat-1');
  });

  it('disables date inputs when year/month filter active', async () => {
    const onChange = vi.fn();
    render(<ExpenseFilters onChange={onChange} />);
    const yearSelect = screen.getByLabelText('Filter by year');
    const monthSelect = screen.getByLabelText('Filter by month');
    const startInput = screen.getByLabelText('Start date');
    const endInput = screen.getByLabelText('End date');

    // Select year and month
    fireEvent.change(yearSelect, { target: { value: String(new Date().getFullYear()) } });
    fireEvent.change(monthSelect, { target: { value: '01' } });

    // Wait for change using waitFor and assertions
    await waitFor(() => expect(startInput).toBeDisabled(), { timeout: 1000 });
    expect(endInput).toBeDisabled();
  });
});
