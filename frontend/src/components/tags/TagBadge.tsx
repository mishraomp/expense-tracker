import React from 'react';
import type { TagInfo } from '../../types/tag';

export interface TagBadgeProps {
  tag: TagInfo;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  onClick?: () => void;
}

/**
 * Displays a colored tag badge/pill.
 * Uses the tag's colorCode for background with contrast-aware text color.
 */
export const TagBadge: React.FC<TagBadgeProps> = ({ tag, size = 'sm', onRemove, onClick }) => {
  const bgColor = tag.colorCode || '#6c757d'; // Default to Bootstrap secondary gray

  // Calculate luminance to determine text color (black or white)
  const getTextColor = (hex: string): string => {
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const textColor = getTextColor(bgColor);
  const sizeClass = size === 'sm' ? 'tag-badge--sm' : 'tag-badge--md';

  return (
    <span
      className={`tag-badge ${sizeClass} ${onClick ? 'tag-badge--clickable' : ''}`}
      style={{ backgroundColor: bgColor, color: textColor }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          className="tag-badge__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove tag ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
};

export default TagBadge;
