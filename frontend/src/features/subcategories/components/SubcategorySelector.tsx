import { useEffect } from 'react';
import { useSubcategories } from '../../expenses/api/subcategoryApi';

interface Props {
  categoryId?: string;
  value?: string | null;
  onChange: (value: string | '') => void;
  disabled?: boolean;
  /** Size variant: 'sm' | 'default' */
  size?: 'sm' | 'default';
  /** Label text (default: 'Subcategory'). Set to empty string to hide label */
  label?: string;
  /** Placeholder for empty option (default: 'None') */
  placeholder?: string;
  /** Hide the label entirely (default: false) */
  hideLabel?: boolean;
}

export default function SubcategorySelector({
  categoryId,
  value,
  onChange,
  disabled,
  size = 'default',
  label = 'Subcategory',
  placeholder = 'None',
  hideLabel = false,
}: Props) {
  const { data: subcategories, isLoading } = useSubcategories(categoryId);

  useEffect(() => {
    // If category changes, and current value is not in list, clear it
    if (!categoryId) return;
    if (!subcategories || subcategories.length === 0) {
      if (value) onChange('');
      return;
    }
    const exists = subcategories.some((s) => s.id === value);
    if (!exists && value) onChange('');
  }, [categoryId, subcategories, value, onChange]);

  if (!categoryId) return null;

  const selectClass = size === 'sm' ? 'form-select form-select-sm' : 'form-select';
  const showLabel = !hideLabel && label;

  return (
    <div>
      {showLabel && (
        <label htmlFor="subcategoryId" className="form-label small mb-1">
          {label}
        </label>
      )}
      <select
        id="subcategoryId"
        className={selectClass}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
      >
        <option value="">{placeholder}</option>
        {(subcategories || []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
