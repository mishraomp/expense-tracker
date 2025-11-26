import React, { useEffect, useState, useCallback } from 'react';
import UploadWidget from './UploadWidget';
import AttachmentList from './AttachmentList';
import { listAttachments } from '@/services/api';
import type { AxiosResponse } from 'axios';

interface ManageAttachmentsModalProps {
  recordType: 'expense' | 'income';
  recordId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Attachment {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  webViewLink: string;
  status: string;
  createdAt: string;
}

const ManageAttachmentsModal: React.FC<ManageAttachmentsModalProps> = ({
  recordType,
  recordId,
  isOpen,
  onClose,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = (await listAttachments(recordType, recordId)) as AxiosResponse<
        Attachment[] | { data: Attachment[] }
      >;
      const payload = response.data;
      const list = Array.isArray(payload) ? payload : payload.data;
      setAttachments(list);
    } catch (e) {
      const err = e as Error & { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || err.message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [recordType, recordId]);

  useEffect(() => {
    if (isOpen) {
      void fetchAttachments();
    }
  }, [isOpen, fetchAttachments]);

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block modal-backdrop-custom"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-attachments-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="manage-attachments-title">
              Manage Attachments
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <UploadWidget
              recordType={recordType}
              recordId={recordId}
              onUploadComplete={() => fetchAttachments()}
            />
            <hr />
            {loading && (
              <div className="my-2" role="status">
                <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading
              </div>
            )}
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {!loading && !error && (
              <AttachmentList
                attachments={attachments}
                onRefresh={() => fetchAttachments()}
                showActions
              />
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAttachmentsModal;
