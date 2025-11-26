import React, { useState, useRef, useEffect } from 'react';
import { uploadAttachment } from '@/services/api';
import { computeSHA256 } from '@/services/checksum';

interface UploadWidgetProps {
  recordType: 'expense' | 'income';
  recordId?: string; // optional to allow pre-save uploads
  getOrCreateRecordId?: () => Promise<string>; // callback to create record if missing
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  checksum?: string;
}

function extractErrorMessage(err: unknown): string {
  const resp = (err as { response?: { data?: { message?: string } } })?.response;
  if (resp?.data?.message) return resp.data.message;
  return err instanceof Error ? err.message : 'Upload failed';
}

const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const UploadWidget: React.FC<UploadWidgetProps> = ({
  recordType,
  recordId,
  getOrCreateRecordId,
  onUploadComplete,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  allowedMimeTypes = DEFAULT_ALLOWED_TYPES,
}) => {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [effectiveRecordId, setEffectiveRecordId] = useState<string | undefined>(recordId);

  // keep internal state synced if parent provides ID later (e.g., user saves form manually)
  useEffect(() => {
    if (recordId && recordId !== effectiveRecordId) {
      setEffectiveRecordId(recordId);
    }
  }, [recordId, effectiveRecordId]);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${Math.round(maxSizeBytes / 1024 / 1024)}MB limit`;
    }
    if (!allowedMimeTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`;
    }
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files per record`);
      return;
    }

    // If we don't yet have a record ID, attempt to create it BEFORE adding files
    if (!effectiveRecordId && getOrCreateRecordId) {
      try {
        const newId = await getOrCreateRecordId();
        setEffectiveRecordId(newId);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Failed to create record before uploading attachments';
        alert(msg);
        // abort selection
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    const newFiles: FileUploadState[] = selectedFiles.map((file) => {
      const error = validateFile(file);
      return {
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (fileState: FileUploadState, index: number): Promise<void> => {
    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: 'uploading', progress: 10 } : f)),
      );

      // Compute checksum
      const checksum = await computeSHA256(fileState.file);
      setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, checksum, progress: 30 } : f)));

      // Prepare form data
      const formData = new FormData();
      formData.append('file', fileState.file);
      formData.append('recordType', recordType);
      if (!effectiveRecordId) {
        throw new Error('Record ID missing; cannot upload');
      }
      formData.append('recordId', effectiveRecordId);
      formData.append('checksum', checksum);

      setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, progress: 50 } : f)));

      // Upload
      await uploadAttachment(formData);

      // Success
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: 'success', progress: 100 } : f)),
      );
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'error', error: errorMessage, progress: 0 } : f,
        ),
      );
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending' && !f.error);

    if (pendingFiles.length === 0) {
      return;
    }

    // Ensure we have a record ID before batch upload (e.g., user clicked Upload All without selecting new files first)
    if (!effectiveRecordId && getOrCreateRecordId) {
      try {
        const newId = await getOrCreateRecordId();
        setEffectiveRecordId(newId);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Failed to create record before uploading attachments';
        alert(msg);
        return;
      }
    }

    setIsUploading(true);

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending' && !files[i].error) {
        await uploadFile(files[i], i);
      }
    }

    setIsUploading(false);

    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const getStatusIcon = (status: FileUploadState['status']) => {
    switch (status) {
      case 'pending':
        return '⏱️';
      case 'uploading':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="upload-widget" role="region" aria-label="File upload">
      <div className="d-flex align-items-center gap-2 mb-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || files.length >= maxFiles}
          aria-label="Select files to upload"
        >
          <span className="me-1" role="img" aria-hidden="true">
            📎
          </span>
          Select Files ({files.length}/{maxFiles})
        </button>
        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          multiple
          accept={allowedMimeTypes.join(',')}
          onChange={handleFileSelect}
          className="file-input-hidden"
          disabled={isUploading || files.length >= maxFiles}
          aria-label="File input"
        />
        {files.length > 0 && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleUploadAll}
            disabled={isUploading || files.every((f) => f.status !== 'pending' || f.error)}
            aria-label="Upload all pending files"
          >
            {isUploading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                Uploading...
              </>
            ) : (
              'Upload All'
            )}
          </button>
        )}
      </div>

      {files.length > 0 && (
        <ul className="file-list" role="list" aria-label="Selected files">
          {files.map((fileState, index) => (
            <li key={index} className={`file-item status-${fileState.status}`} role="listitem">
              <div className="file-info">
                <span className="status-icon" aria-label={`Status: ${fileState.status}`}>
                  {getStatusIcon(fileState.status)}
                </span>
                <span className="file-name">{fileState.file.name}</span>
                <span className="file-size">{formatFileSize(fileState.file.size)}</span>
              </div>

              {fileState.status === 'uploading' && (
                <div
                  className="progress mt-1"
                  role="progressbar"
                  aria-valuenow={fileState.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    style={{ width: `${fileState.progress}%` }}
                    aria-label={`Uploading ${fileState.file.name}`}
                  />
                </div>
              )}

              {fileState.error && (
                <div className="error-message" role="alert" aria-live="polite">
                  {fileState.error}
                </div>
              )}

              {(fileState.status === 'pending' || fileState.status === 'error') && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm ms-2"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                  aria-label={`Remove ${fileState.file.name}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="upload-info" aria-live="polite">
        <small>
          Max {maxFiles} files, up to {Math.round(maxSizeBytes / 1024 / 1024)}MB each. Allowed: PDF,
          PNG, JPEG, Excel, Word
        </small>
      </div>
    </div>
  );
};

export default UploadWidget;
