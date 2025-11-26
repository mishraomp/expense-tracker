import React, { useState } from 'react';
import PreviewModal from './PreviewModal';
import { replaceAttachment, removeAttachment } from '@/services/api';

interface Attachment {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  webViewLink: string;
  status: string;
  createdAt: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onRefresh?: () => void;
  showActions?: boolean; // Show replace/remove buttons
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  onRefresh,
  showActions = true,
}) => {
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isReplacing, setIsReplacing] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    return '📎';
  };

  const handleOpenLink = (webViewLink: string) => {
    window.open(webViewLink, '_blank', 'noopener,noreferrer');
  };

  const handlePreview = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setIsPreviewOpen(true);
  };

  const handleReplace = async (
    attachmentId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReplacing(attachmentId);
    try {
      await replaceAttachment(attachmentId, file);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to replace attachment:', error);
      alert('Failed to replace attachment');
    } finally {
      setIsReplacing(null);
    }
  };

  const handleRemove = async (attachmentId: string) => {
    if (
      !confirm('Are you sure you want to remove this attachment? It will be deleted after 90 days.')
    ) {
      return;
    }

    setIsRemoving(attachmentId);
    try {
      await removeAttachment(attachmentId);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to remove attachment:', error);
      alert('Failed to remove attachment');
    } finally {
      setIsRemoving(null);
    }
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className="attachment-list-empty" role="status">
        <p>No attachments</p>
      </div>
    );
  }

  return (
    <>
      <div className="attachment-list" role="region" aria-label="Attachments">
        <div className="attachment-list-header">
          <h3>Attachments ({attachments.length})</h3>
          {onRefresh && (
            <button
              type="button"
              className="refresh-btn"
              onClick={onRefresh}
              aria-label="Refresh attachments"
            >
              🔄
            </button>
          )}
        </div>

        <ul className="attachments" role="list">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="attachment-item" role="listitem">
              <div className="attachment-info">
                <span className="file-icon" aria-hidden="true">
                  {getFileIcon(attachment.mimeType)}
                </span>
                <div className="attachment-details">
                  <span className="attachment-name">{attachment.originalFilename}</span>
                  <span className="attachment-meta">
                    {formatFileSize(attachment.sizeBytes)} • {formatDate(attachment.createdAt)}
                    {attachment.status === 'REMOVED' && (
                      <span className="badge bg-warning ms-2">Removed</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="attachment-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handlePreview(attachment)}
                  aria-label={`Preview ${attachment.originalFilename}`}
                >
                  👁️ Preview
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleOpenLink(attachment.webViewLink)}
                  aria-label={`Open ${attachment.originalFilename} in new tab`}
                >
                  🔗 Open
                </button>
                {showActions && attachment.status === 'ACTIVE' && (
                  <>
                    <label
                      className={`btn btn-sm btn-outline-info ${isReplacing === attachment.id ? 'disabled' : ''}`}
                    >
                      {isReplacing === attachment.id ? '⏳ Replacing...' : '🔄 Replace'}
                      <input
                        type="file"
                        className="file-input-hidden"
                        onChange={(e) => handleReplace(attachment.id, e)}
                        disabled={isReplacing === attachment.id}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleRemove(attachment.id)}
                      disabled={isRemoving === attachment.id}
                      aria-label={`Remove ${attachment.originalFilename}`}
                    >
                      {isRemoving === attachment.id ? '⏳ Removing...' : '🗑️ Remove'}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        attachment={selectedAttachment}
      />
    </>
  );
};

export default AttachmentList;
