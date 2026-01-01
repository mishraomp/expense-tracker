import { toYYYYMMDD } from '@/services/date';

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

export interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onQuickPresetClick?: (preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all') => void;
  disabled?: boolean;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onQuickPresetClick,
  disabled = false,
}: DateRangeFilterProps) {
  const handleQuickPreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all') => {
    const now = new Date();

    switch (preset) {
      case 'today': {
        const today = toYYYYMMDD(now);
        onStartDateChange(today);
        onEndDateChange(today);
        break;
      }
      case 'week': {
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        onStartDateChange(toYYYYMMDD(start));
        onEndDateChange(toYYYYMMDD(end));
        break;
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        onStartDateChange(toYYYYMMDD(start));
        onEndDateChange(toYYYYMMDD(end));
        break;
      }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1);
        const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        onStartDateChange(toYYYYMMDD(start));
        onEndDateChange(toYYYYMMDD(end));
        break;
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        onStartDateChange(toYYYYMMDD(start));
        onEndDateChange(toYYYYMMDD(end));
        break;
      }
      case 'all':
        onStartDateChange('');
        onEndDateChange('');
        break;
    }

    onQuickPresetClick?.(preset);
  };

  return (
    <div className="mb-3">
      <h6 className="fw-semibold mb-2">Date Range</h6>
      <div className="row g-2 align-items-end">
        <div className="col-auto">
          <label htmlFor="dateRangeStart" className="form-label small mb-1">
            Start Date
          </label>
          <input
            id="dateRangeStart"
            type="date"
            className="form-control form-control-sm"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="col-auto">
          <label htmlFor="dateRangeEnd" className="form-label small mb-1">
            End Date
          </label>
          <input
            id="dateRangeEnd"
            type="date"
            className="form-control form-control-sm"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="col-auto">
          <div className="btn-group btn-group-sm" role="group" aria-label="Quick date presets">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleQuickPreset('today')}
              disabled={disabled}
              title="Today"
            >
              Today
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleQuickPreset('week')}
              disabled={disabled}
              title="This week"
            >
              Week
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleQuickPreset('month')}
              disabled={disabled}
              title="This month"
            >
              Month
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleQuickPreset('quarter')}
              disabled={disabled}
              title="This quarter"
            >
              Quarter
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleQuickPreset('year')}
              disabled={disabled}
              title="This year"
            >
              Year
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleQuickPreset('all')}
              disabled={disabled}
              title="All time"
            >
              All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
