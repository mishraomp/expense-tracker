import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { CreateExpenseInput, Expense } from '../types/expense.types';
import { useCreateExpense, useUpdateExpense } from '../api/expenseApi';
import { useCategories } from '../api/categoryApi';
import SubcategorySelector from '../../subcategories/components/SubcategorySelector';

interface ExpenseFormProps {
  expense?: Expense | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateExpenseInput>({
    // Use local date (YYYY-MM-DD) instead of UTC to avoid off-by-one
    defaultValues: {
      date: (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      })(),
    },
  });

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  const isEditMode = !!expense;

  // Reset form when expense prop changes (edit mode)
  useEffect(() => {
    if (expense) {
      reset({
        amount: expense.amount,
        date: expense.date,
        categoryId: expense.categoryId,
        subcategoryId: expense.subcategoryId || undefined,
        description: expense.description || '',
      });
      setIsRecurring(false);
    } else {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      reset({ date: `${y}-${m}-${day}` });
      setIsRecurring(false);
    }
  }, [expense, reset]);

  const selectedCategoryId = watch('categoryId');
  const previousCategoryIdRef = useRef<string | undefined>(undefined);

  // Clear subcategory only when category changes (not on initial load/edit)
  useEffect(() => {
    if (
      previousCategoryIdRef.current !== undefined &&
      previousCategoryIdRef.current !== selectedCategoryId
    ) {
      setValue('subcategoryId', undefined);
    }
    previousCategoryIdRef.current = selectedCategoryId;
  }, [selectedCategoryId, setValue]);

  const onSubmit = async (data: CreateExpenseInput) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateExpense.mutateAsync({ id: expense.id, data });
      } else {
        const submitData = {
          ...data,
          recurring: isRecurring,
          recurrenceFrequency: isRecurring ? data.recurrenceFrequency : undefined,
          numberOfRecurrences: isRecurring ? data.numberOfRecurrences : undefined,
        };
        await createExpense.mutateAsync(submitData);
      }
      reset();
      setIsRecurring(false);
      onSuccess?.();
      // Error toast is handled in the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  // Live description character count
  const descriptionValue = watch('description') || '';
  const descriptionLength = descriptionValue.length;

  return (
    <div className="card">
      <div className="card-body p-2">
        <h6 className="card-title mb-2">{isEditMode ? 'Edit Expense' : 'Add New Expense'}</h6>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="row g-2">
            <div className="col-md-6">
              <label htmlFor="amount" className="form-label small mb-1">
                Amount <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  step="0.01"
                  className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                  id="amount"
                  placeholder="0.00"
                  aria-label="Expense amount"
                  aria-describedby="amount-error"
                  aria-required="true"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be positive' },
                    valueAsNumber: true,
                  })}
                />
                {errors.amount && (
                  <div id="amount-error" className="invalid-feedback">
                    {errors.amount.message}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <label htmlFor="date" className="form-label small mb-1">
                Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                id="date"
                aria-label="Expense date"
                aria-describedby="date-error"
                aria-required="true"
                {...register('date', { required: 'Date is required' })}
              />
              {errors.date && (
                <div id="date-error" className="invalid-feedback">
                  {errors.date.message}
                </div>
              )}
            </div>

            <div className="col-12">
              <label htmlFor="categoryId" className="form-label small mb-1">
                Category <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                id="categoryId"
                aria-label="Expense category"
                aria-describedby="category-error"
                aria-required="true"
                disabled={categoriesLoading}
                {...register('categoryId', { required: 'Category is required' })}
              >
                <option value="">Select a category</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <div id="category-error" className="invalid-feedback">
                  {errors.categoryId.message}
                </div>
              )}
            </div>

            <div className="col-12">
              <SubcategorySelector
                categoryId={selectedCategoryId}
                value={watch('subcategoryId') || ''}
                onChange={(val) => setValue('subcategoryId', val || undefined)}
                disabled={categoriesLoading}
              />
            </div>

            <div className="col-12">
              <label htmlFor="description" className="form-label small mb-1">
                Description
              </label>
              <textarea
                className="form-control"
                id="description"
                rows={2}
                placeholder="Optional notes about this expense"
                aria-label="Expense description"
                maxLength={500}
                {...register('description')}
              />
              <div className="form-text small" aria-live="polite">
                {descriptionLength} / 500 characters
              </div>
            </div>

            {!isEditMode && (
              <>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="recurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="recurring">
                      Recurring
                    </label>
                  </div>
                </div>

                {isRecurring && (
                  <>
                    <div className="col-md-6">
                      <label htmlFor="recurrenceFrequency" className="form-label small mb-1">
                        Frequency <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.recurrenceFrequency ? 'is-invalid' : ''}`}
                        id="recurrenceFrequency"
                        aria-label="Recurrence frequency"
                        {...register('recurrenceFrequency', {
                          required: isRecurring ? 'Frequency is required' : false,
                        })}
                      >
                        <option value="">Select frequency</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      {errors.recurrenceFrequency && (
                        <div className="invalid-feedback">{errors.recurrenceFrequency.message}</div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="numberOfRecurrences" className="form-label small mb-1">
                        Number of Recurrences <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${errors.numberOfRecurrences ? 'is-invalid' : ''}`}
                        id="numberOfRecurrences"
                        placeholder="e.g., 12"
                        min="1"
                        max="365"
                        aria-label="Number of recurrences"
                        {...register('numberOfRecurrences', {
                          required: isRecurring ? 'Number of recurrences is required' : false,
                          min: { value: 1, message: 'Must be at least 1' },
                          max: { value: 365, message: 'Cannot exceed 365' },
                          valueAsNumber: true,
                        })}
                      />
                      {errors.numberOfRecurrences && (
                        <div className="invalid-feedback">{errors.numberOfRecurrences.message}</div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="col-12">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSubmitting || categoriesLoading}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    {isEditMode ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>{isEditMode ? 'Update Expense' : 'Add Expense'}</>
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm ms-2"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {isEditMode ? 'Cancel' : 'Clear'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
