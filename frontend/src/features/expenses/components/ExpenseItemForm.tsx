import { useForm } from 'react-hook-form';
import type { CreateExpenseItemInput } from '../types/expense-item.types';
import type { Category } from '../types/expense.types';
import SubcategorySelector from '../../subcategories/components/SubcategorySelector';
import { useEffect, useRef } from 'react';

interface ExpenseItemFormProps {
  /** Available categories for selection */
  categories: Category[];
  /** Called when an item is added */
  onAddItem: (item: CreateExpenseItemInput) => void;
  /** Whether form is disabled */
  disabled?: boolean;
  /** Default category from parent expense */
  defaultCategoryId?: string;
  /** Default subcategory from parent expense */
  defaultSubcategoryId?: string;
}

/**
 * Inline form for adding expense items.
 * Used within ExpenseForm to add line items to an expense.
 */
export default function ExpenseItemForm({
  categories,
  onAddItem,
  disabled = false,
  defaultCategoryId,
  defaultSubcategoryId,
}: ExpenseItemFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateExpenseItemInput>({
    defaultValues: {
      categoryId: defaultCategoryId,
      subcategoryId: defaultSubcategoryId,
    },
  });

  const selectedCategoryId = watch('categoryId');
  const previousCategoryIdRef = useRef<string | undefined>(undefined);

  // Clear subcategory when category changes
  useEffect(() => {
    if (
      previousCategoryIdRef.current !== undefined &&
      previousCategoryIdRef.current !== selectedCategoryId
    ) {
      setValue('subcategoryId', undefined);
    }
    previousCategoryIdRef.current = selectedCategoryId;
  }, [selectedCategoryId, setValue]);

  // Update defaults when parent expense category changes
  useEffect(() => {
    if (defaultCategoryId && !selectedCategoryId) {
      setValue('categoryId', defaultCategoryId);
    }
  }, [defaultCategoryId, selectedCategoryId, setValue]);

  useEffect(() => {
    if (defaultSubcategoryId && !watch('subcategoryId')) {
      setValue('subcategoryId', defaultSubcategoryId);
    }
  }, [defaultSubcategoryId, setValue, watch]);

  const onSubmit = (data: CreateExpenseItemInput) => {
    onAddItem({
      name: data.name.trim(),
      amount: data.amount,
      categoryId: data.categoryId || undefined,
      subcategoryId: data.subcategoryId || undefined,
      notes: data.notes?.trim() || undefined,
    });
    // Reset form but keep category/subcategory for convenience
    reset({
      name: '',
      amount: undefined,
      categoryId: selectedCategoryId,
      subcategoryId: watch('subcategoryId'),
      notes: '',
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-2 bg-light rounded border">
      <div className="row g-2 align-items-end">
        <div className="col-md-3">
          <label htmlFor="itemName" className="form-label small mb-1">
            Item Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
            id="itemName"
            placeholder="e.g., tshirt"
            disabled={disabled}
            {...register('name', {
              required: 'Name is required',
              maxLength: { value: 200, message: 'Max 200 characters' },
            })}
          />
          {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
        </div>

        <div className="col-md-2">
          <label htmlFor="itemAmount" className="form-label small mb-1">
            Amount <span className="text-danger">*</span>
          </label>
          <div className="input-group input-group-sm">
            <span className="input-group-text">$</span>
            <input
              type="number"
              step="0.01"
              className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
              id="itemAmount"
              placeholder="0.00"
              disabled={disabled}
              {...register('amount', {
                required: 'Amount required',
                min: { value: 0.01, message: 'Must be positive' },
                valueAsNumber: true,
              })}
            />
            {errors.amount && <div className="invalid-feedback">{errors.amount.message}</div>}
          </div>
        </div>

        <div className="col-md-2">
          <label htmlFor="itemCategory" className="form-label small mb-1">
            Category
          </label>
          <select
            className="form-select form-select-sm"
            id="itemCategory"
            disabled={disabled}
            {...register('categoryId')}
          >
            <option value="">Use parent</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-2">
          <SubcategorySelector
            categoryId={selectedCategoryId || defaultCategoryId}
            value={watch('subcategoryId') || ''}
            onChange={(val) => setValue('subcategoryId', val || undefined)}
            disabled={disabled}
            size="sm"
            label="Subcategory"
            placeholder="Use parent"
          />
        </div>

        <div className="col-md-2">
          <label htmlFor="itemNotes" className="form-label small mb-1">
            Notes
          </label>
          <input
            type="text"
            className="form-control form-control-sm"
            id="itemNotes"
            placeholder="Optional"
            disabled={disabled}
            maxLength={500}
            {...register('notes', {
              maxLength: { value: 500, message: 'Max 500 characters' },
            })}
          />
        </div>

        <div className="col-md-1">
          <button
            type="submit"
            className="btn btn-primary btn-sm w-100"
            disabled={disabled}
            title="Add item"
          >
            <i className="bi bi-plus-lg"></i>
          </button>
        </div>
      </div>
    </form>
  );
}
