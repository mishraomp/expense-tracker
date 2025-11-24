import React, { useState, useRef } from 'react';
import { BulkProgress } from './BulkProgress';
import { BulkMappingSuggestions } from './BulkMappingSuggestions';
import { startBulkImport, getBulkJobStatus } from '../../services/api';

interface BulkImportPanelProps {
  recordType: 'expense' | 'income';
  onComplete?: () => void;
}

interface BulkJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'canceled' | 'failed';
  totalFiles: number;
  uploadedCount?: number;
  duplicateCount?: number;
  errorCount?: number;
  skippedCount?: number;
}

export const BulkImportPanel: React.FC<BulkImportPanelProps> = ({ recordType, onComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentJob, setCurrentJob] = useState<BulkJob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordIds, setRecordIds] = useState<(string | undefined)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setRecordIds(files.map(() => undefined)); // Initialize recordIds as undefined
  };

  const handleMappingChange = (fileIndex: number, recordId: string | undefined) => {
    const newRecordIds = [...recordIds];
    newRecordIds[fileIndex] = recordId;
    setRecordIds(newRecordIds);
  };

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Start bulk import
      const result = await startBulkImport(recordType, selectedFiles, recordIds);
      setCurrentJob(result);

      // Poll for job status
      startPolling(result.jobId);
    } catch (error) {
      console.error('Bulk import failed:', error);
      alert('Failed to start bulk import');
      setIsUploading(false);
    }
  };

  const startPolling = (jobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const status = await getBulkJobStatus(jobId);
        setCurrentJob(status);

        // Stop polling when job completes
        if (
          status.status === 'completed' ||
          status.status === 'canceled' ||
          status.status === 'failed'
        ) {
          stopPolling();
          setIsUploading(false);
          if (status.status === 'completed' && onComplete) {
            onComplete();
          }
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error);
        stopPolling();
        setIsUploading(false);
      }
    }, 2000); // Poll every 2 seconds
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => stopPolling(); // Cleanup on unmount
  }, []);

  return (
    <div className="bulk-import-panel">
      <h3>Bulk Import {recordType === 'expense' ? 'Expenses' : 'Incomes'}</h3>

      {!currentJob && (
        <>
          <div className="file-selection">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.csv"
              onChange={handleFileSelection}
              style={{ display: 'none' }}
            />
            <button onClick={() => fileInputRef.current?.click()}>Select Files</button>
            <span>{selectedFiles.length} files selected</span>
          </div>

          {selectedFiles.length > 0 && (
            <>
              <BulkMappingSuggestions
                files={selectedFiles}
                recordType={recordType}
                recordIds={recordIds}
                onMappingChange={handleMappingChange}
              />

              <button onClick={handleStartUpload} disabled={isUploading}>
                {isUploading ? 'Starting...' : 'Start Import'}
              </button>
            </>
          )}
        </>
      )}

      {currentJob && <BulkProgress job={currentJob} />}
    </div>
  );
};
