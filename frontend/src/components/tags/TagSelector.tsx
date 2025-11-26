import React, { useState, useRef, useEffect } from 'react';
import type { Tag } from '../../types/tag';
import { TagBadge } from './TagBadge';

export interface TagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

/**
 * Multi-select dropdown for selecting tags.
 * Displays selected tags as badges and allows adding/removing.
 */
export const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  placeholder = 'Select tags...',
  disabled = false,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const availableTags = tags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) && t.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
    } else if (e.key === 'Enter' && searchTerm && onCreateTag && availableTags.length === 0) {
      e.preventDefault();
      onCreateTag(searchTerm);
      setSearchTerm('');
    }
  };

  const showCreateOption =
    onCreateTag &&
    searchTerm &&
    !tags.some((t) => t.name.toLowerCase() === searchTerm.toLowerCase());

  return (
    <div className="tag-selector" ref={containerRef}>
      <div
        className="tag-selector__trigger"
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        {selectedTags.length === 0 && !isOpen && (
          <span className="text-muted small">{placeholder}</span>
        )}

        {selectedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            tag={tag}
            size="sm"
            onRemove={disabled ? undefined : () => handleRemove(tag.id)}
          />
        ))}

        {isOpen && (
          <input
            ref={inputRef}
            type="text"
            className="tag-selector__input border-0 bg-transparent p-0 flex-grow-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length === 0 ? 'Search tags...' : ''}
            style={{ outline: 'none', minWidth: '4rem' }}
          />
        )}

        {isLoading && (
          <span className="spinner-border spinner-border-sm ms-auto" role="status">
            <span className="visually-hidden">Loading...</span>
          </span>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="tag-selector__dropdown" role="listbox">
          {availableTags.length === 0 && !showCreateOption && (
            <div className="text-muted small p-2 text-center">
              {searchTerm ? 'No matching tags' : 'No more tags available'}
            </div>
          )}

          {availableTags.map((tag) => (
            <div
              key={tag.id}
              className="tag-selector__option"
              role="option"
              aria-selected={selectedTagIds.includes(tag.id)}
              onClick={() => handleToggle(tag.id)}
            >
              <TagBadge tag={tag} size="sm" />
            </div>
          ))}

          {showCreateOption && (
            <div
              className="tag-selector__create"
              onClick={() => {
                onCreateTag!(searchTerm);
                setSearchTerm('');
              }}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Create "{searchTerm}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
