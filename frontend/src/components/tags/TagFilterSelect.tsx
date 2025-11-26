import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Tag } from '../../types/tag';
import { TagBadge } from './TagBadge';

export interface TagFilterSelectProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Compact multi-select dropdown for filtering by tags in table headers.
 * Optimized for inline table filter rows with minimal height.
 * Uses a portal to escape overflow:hidden containers.
 */
export const TagFilterSelect: React.FC<TagFilterSelectProps> = ({
  tags,
  selectedTagIds,
  onChange,
  placeholder = 'Filter by tag...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const availableTags = tags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) && t.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 2,
        left: rect.left,
        width: Math.max(rect.width, 192), // min-width: 12rem = 192px
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemove = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const dropdown = isOpen && !disabled && (
    <div
      ref={dropdownRef}
      className="tag-filter-select__dropdown"
      role="listbox"
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
    >
      <div className="tag-filter-select__search">
        <input
          ref={inputRef}
          type="text"
          className="form-control form-control-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tags..."
          aria-label="Search tags"
        />
      </div>

      <div className="tag-filter-select__options">
        {availableTags.length === 0 ? (
          <div className="tag-filter-select__empty">
            {searchTerm ? 'No matching tags' : 'No more tags'}
          </div>
        ) : (
          availableTags.map((tag) => (
            <div
              key={tag.id}
              className="tag-filter-select__option"
              role="option"
              aria-selected={false}
              onClick={() => handleToggle(tag.id)}
            >
              <TagBadge tag={tag} size="sm" />
            </div>
          ))
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="tag-filter-select__footer">
          <span className="small text-muted">{selectedTags.length} selected</span>
          <button type="button" className="btn btn-link btn-sm p-0" onClick={handleClearAll}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="tag-filter-select" ref={containerRef}>
      <div
        ref={triggerRef}
        className={`tag-filter-select__trigger ${isOpen ? 'tag-filter-select__trigger--open' : ''} ${disabled ? 'tag-filter-select__trigger--disabled' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span className="tag-filter-select__placeholder">
          {selectedTags.length > 0 ? `${selectedTags.length} selected` : placeholder}
        </span>
        <div className="tag-filter-select__actions">
          {selectedTags.length > 0 && (
            <button
              type="button"
              className="tag-filter-select__clear"
              onClick={handleClearAll}
              aria-label="Clear all tags"
              title="Clear all tags"
            >
              ×
            </button>
          )}
          <span className="tag-filter-select__arrow">▼</span>
        </div>
      </div>

      {/* Selected tags shown as pills below the trigger */}
      {selectedTags.length > 0 && (
        <div className="tag-filter-select__pills">
          {selectedTags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} size="sm" onRemove={() => handleRemove(tag.id)} />
          ))}
        </div>
      )}

      {createPortal(dropdown, document.body)}
    </div>
  );
};

export default TagFilterSelect;
