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
  /** Parent expense amount for validation */
  expenseAmount?: number;
  /** Current total of existing items */
  currentItemsTotal?: number;
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
  expenseAmount,
  currentItemsTotal = 0,
}: ExpenseItemFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm<CreateExpenseItemInput>({
    defaultValues: {
      categoryId: defaultCategoryId,
      subcategoryId: defaultSubcategoryId,
    },
  });

  const selectedCategoryId = watch('categoryId');
  const itemAmount = watch('amount');
  const previousCategoryIdRef = useRef<string | undefined>(undefined);

  // Calculate remaining budget for validation
  const remainingBudget = expenseAmount ? expenseAmount - currentItemsTotal : undefined;
  const wouldExceedBudget = remainingBudget !== undefined && itemAmount > remainingBudget;

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

  const handleAddItem = handleSubmit((data: CreateExpenseItemInput) => {
    // Validate amount won't exceed expense total
    if (remainingBudget !== undefined && data.amount > remainingBudget) {
      setError('amount', {
        type: 'manual',
        message: `Exceeds remaining $${remainingBudget.toFixed(2)}`,
      });
      return;
    }
    clearErrors('amount');

    onAddItem({
      name: data.name.trim(),
      amount: data.amount,
      categoryId: data.categoryId || undefined,
      subcategoryId: data.subcategoryId || undefined,
      notes: data.notes?.trim() || undefined,
      gstApplicable: data.gstApplicable,
      pstApplicable: data.pstApplicable,
    });
    // Reset form but keep category/subcategory for convenience
    reset({
      name: '',
      amount: undefined,
      categoryId: selectedCategoryId,
      subcategoryId: watch('subcategoryId'),
      notes: '',
      gstApplicable: false,
      pstApplicable: false,
    });
  });

  // Handle Enter key to add item (since we're not using a form element)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div className="p-2 bg-light rounded border" onKeyDown={handleKeyDown}>
      <div className="row g-2 align-items-end">
        <div className="col-lg-2 col-md-3">
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

        <div className="col-lg-2 col-md-2">
          <label htmlFor="itemAmount" className="form-label small mb-1">
            Amount <span className="text-danger">*</span>
            {remainingBudget !== undefined && (
              <span className={`ms-1 ${remainingBudget <= 0 ? 'text-danger' : 'text-muted'}`}>
                (${remainingBudget.toFixed(2)} left)
              </span>
            )}
          </label>
          <div className="input-group input-group-sm">
            <span className="input-group-text">$</span>
            <input
              type="number"
              step="0.01"
              className={`form-control ${errors.amount || wouldExceedBudget ? 'is-invalid' : ''}`}
              id="itemAmount"
              placeholder="0.00"
              disabled={disabled || remainingBudget === 0}
              {...register('amount', {
                required: 'Amount required',
                min: { value: 0.01, message: 'Must be positive' },
                valueAsNumber: true,
              })}
            />
            {errors.amount && <div className="invalid-feedback">{errors.amount.message}</div>}
            {wouldExceedBudget && !errors.amount && (
              <div className="invalid-feedback d-block">Exceeds remaining budget</div>
            )}
          </div>
        </div>

        <div className="col-lg-2 col-md-2">
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

        <div className="col-lg-2 col-md-2">
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

        <div className="col-lg-1 col-md-1">
          <label htmlFor="itemNotes" className="form-label small mb-1">
            Notes
          </label>
          <input
            type="text"
            className="form-control form-control-sm"
            id="itemNotes"
            placeholder=""
            disabled={disabled}
            maxLength={500}
            {...register('notes', {
              maxLength: { value: 500, message: 'Max 500 characters' },
            })}
          />
        </div>

        <div className="col-lg-2 col-md-2">
          <label className="form-label small mb-1 text-center d-block">Tax</label>
          <div className="d-flex justify-content-center gap-2">
            <div className="form-check mb-0" title="GST 5%">
              <input
                className="form-check-input"
                type="checkbox"
                id="itemGstApplicable"
                disabled={disabled}
                {...register('gstApplicable')}
              />
              <label className="form-check-label small" htmlFor="itemGstApplicable">
                GST
              </label>
            </div>
            <div className="form-check mb-0" title="PST 7%">
              <input
                className="form-check-input"
                type="checkbox"
                id="itemPstApplicable"
                disabled={disabled}
                {...register('pstApplicable')}
              />
              <label className="form-check-label small" htmlFor="itemPstApplicable">
                PST
              </label>
            </div>
          </div>
        </div>

        <div className="col-lg-1 col-md-auto">
          <label className="form-label small mb-1 d-none d-lg-block">&nbsp;</label>
          <button
            type="button"
            className="btn btn-primary btn-sm w-50"
            disabled={disabled || wouldExceedBudget || remainingBudget === 0}
            title={
              wouldExceedBudget
                ? 'Amount exceeds remaining budget'
                : remainingBudget === 0
                  ? 'No budget remaining'
                  : 'Add item'
            }
            onClick={handleAddItem}
          >
            <i className="bi bi-plus-lg"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
