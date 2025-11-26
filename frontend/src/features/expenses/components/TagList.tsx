import { useState } from 'react';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../api/tagApi';
import { TagBadge } from '@/components/tags';
import type { Tag, CreateTagDto, UpdateTagDto } from '@/types/tag';

// Default color palette for new tags
const COLOR_PALETTE = [
  '#3498db', // Blue
  '#2ecc71', // Green
  '#e74c3c', // Red
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
  '#e91e63', // Pink
  '#795548', // Brown
  '#607d8b', // Blue Gray
  '#ff5722', // Deep Orange
];

interface TagFormData {
  name: string;
  colorCode: string;
}

export default function TagList() {
  const { data: tags = [], isLoading, error } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [isCreating, setIsCreating] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TagFormData>({ name: '', colorCode: COLOR_PALETTE[0] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ name: '', colorCode: COLOR_PALETTE[0] });
    setIsCreating(false);
    setEditingTagId(null);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    try {
      await createTag.mutateAsync({
        name: formData.name.trim(),
        colorCode: formData.colorCode,
      } as CreateTagDto);
      resetForm();
    } catch {
      // Error handled by mutation
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) return;

    try {
      await updateTag.mutateAsync({
        id,
        data: {
          name: formData.name.trim(),
          colorCode: formData.colorCode,
        } as UpdateTagDto,
      });
      resetForm();
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTag.mutateAsync(id);
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setFormData({ name: tag.name, colorCode: tag.colorCode || COLOR_PALETTE[0] });
    setIsCreating(false);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingTagId(null);
    // Pick a random color from palette that's not already used
    const usedColors = tags.map((t) => t.colorCode);
    const availableColors = COLOR_PALETTE.filter((c) => !usedColors.includes(c));
    const randomColor =
      availableColors.length > 0
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    setFormData({ name: '', colorCode: randomColor });
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading tags...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            Failed to load tags: {(error as Error).message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span>Your Tags ({tags.length})</span>
        {!isCreating && (
          <button className="btn btn-primary btn-sm" onClick={startCreate}>
            <i className="bi bi-plus me-1"></i> New Tag
          </button>
        )}
      </div>
      <div className="card-body">
        {/* Create form */}
        {isCreating && (
          <div className="card mb-3 border-primary">
            <div className="card-body">
              <h6 className="card-title">Create New Tag</h6>
              <div className="row g-2 align-items-end">
                <div className="col-md-4">
                  <label className="form-label small" htmlFor="tagName">
                    Name
                  </label>
                  <input
                    type="text"
                    id="tagName"
                    className="form-control form-control-sm"
                    placeholder="Tag name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small" htmlFor="tagColor">
                    Color
                  </label>
                  <div className="d-flex gap-1 flex-wrap">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`btn btn-sm p-0 border-2 ${formData.colorCode === color ? 'border-dark' : 'border-light'}`}
                        style={{
                          width: '1.5rem',
                          height: '1.5rem',
                          backgroundColor: color,
                          borderRadius: '0.25rem',
                        }}
                        onClick={() => setFormData({ ...formData, colorCode: color })}
                        title={color}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                    <input
                      type="color"
                      id="tagColor"
                      className="form-control form-control-color p-0"
                      style={{ width: '1.5rem', height: '1.5rem' }}
                      value={formData.colorCode}
                      onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
                      title="Custom color"
                    />
                  </div>
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Preview</label>
                  <div>
                    <TagBadge
                      tag={{
                        id: 'preview',
                        name: formData.name || 'Tag',
                        colorCode: formData.colorCode,
                      }}
                      size="md"
                    />
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={handleCreate}
                      disabled={!formData.name.trim() || createTag.isPending}
                    >
                      {createTag.isPending ? 'Saving...' : 'Create'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={resetForm}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tags list */}
        {tags.length === 0 && !isCreating ? (
          <div className="text-center text-muted py-4">
            <i className="bi bi-tag fs-1 mb-2 d-block"></i>
            <p>No tags yet. Create your first tag to start organizing expenses.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Color</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id}>
                    {editingTagId === tag.id ? (
                      <>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                          />
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap align-items-center">
                            {COLOR_PALETTE.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`btn btn-sm p-0 border-2 ${formData.colorCode === color ? 'border-dark' : 'border-light'}`}
                                style={{
                                  width: '1.25rem',
                                  height: '1.25rem',
                                  backgroundColor: color,
                                  borderRadius: '0.25rem',
                                }}
                                onClick={() => setFormData({ ...formData, colorCode: color })}
                                title={color}
                              />
                            ))}
                            <input
                              type="color"
                              className="form-control form-control-color p-0"
                              style={{ width: '1.25rem', height: '1.25rem' }}
                              value={formData.colorCode}
                              onChange={(e) =>
                                setFormData({ ...formData, colorCode: e.target.value })
                              }
                            />
                          </div>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-success btn-sm me-1"
                            onClick={() => handleUpdate(tag.id)}
                            disabled={!formData.name.trim() || updateTag.isPending}
                          >
                            {updateTag.isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={resetForm}>
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <TagBadge tag={tag} size="md" />
                        </td>
                        <td>
                          <span
                            className="d-inline-block rounded"
                            style={{
                              width: '1.25rem',
                              height: '1.25rem',
                              backgroundColor: tag.colorCode || '#6c757d',
                            }}
                            title={tag.colorCode || '#6c757d'}
                          ></span>
                        </td>
                        <td className="text-end">
                          {deleteConfirm === tag.id ? (
                            <>
                              <span className="text-danger me-2 small">Delete?</span>
                              <button
                                className="btn btn-danger btn-sm me-1"
                                onClick={() => handleDelete(tag.id)}
                                disabled={deleteTag.isPending}
                              >
                                {deleteTag.isPending ? '...' : 'Yes'}
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                No
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-outline-primary btn-sm me-1"
                                onClick={() => startEdit(tag)}
                                title="Edit tag"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => setDeleteConfirm(tag.id)}
                                title="Delete tag"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
