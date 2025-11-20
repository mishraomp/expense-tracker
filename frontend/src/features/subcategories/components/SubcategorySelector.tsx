import { useEffect } from 'react';
import { useSubcategories } from '../../expenses/api/subcategoryApi';

interface Props {
  categoryId?: string;
  value?: string | null;
  onChange: (value: string | '') => void;
  disabled?: boolean;
}

export default function SubcategorySelector({ categoryId, value, onChange, disabled }: Props) {
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

  return (
    <div>
      <label htmlFor="subcategoryId" className="form-label small mb-1">
        Subcategory
      </label>
      <select
        id="subcategoryId"
        className="form-select form-select-sm"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
      >
        <option value="">None</option>
        {(subcategories || []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
