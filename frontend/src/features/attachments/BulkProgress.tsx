import React from 'react';

interface BulkJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'canceled' | 'failed';
  totalFiles: number;
  uploadedCount?: number;
  duplicateCount?: number;
  errorCount?: number;
  skippedCount?: number;
}

interface BulkProgressProps {
  job: BulkJob;
}

export const BulkProgress: React.FC<BulkProgressProps> = ({ job }) => {
  const processed =
    (job.uploadedCount || 0) +
    (job.duplicateCount || 0) +
    (job.errorCount || 0) +
    (job.skippedCount || 0);
  const progress = job.totalFiles > 0 ? (processed / job.totalFiles) * 100 : 0;

  const getStatusLabel = () => {
    switch (job.status) {
      case 'pending':
        return 'Pending...';
      case 'running':
        return 'Uploading...';
      case 'completed':
        return 'Completed!';
      case 'canceled':
        return 'Canceled';
      case 'failed':
        return 'Failed';
      default:
        return job.status;
    }
  };

  const getStatusClass = () => {
    switch (job.status) {
      case 'completed':
        return 'text-success';
      case 'failed':
        return 'text-danger';
      case 'canceled':
        return 'text-warning';
      default:
        return 'text-primary';
    }
  };

  const getProgressClass = () => {
    switch (job.status) {
      case 'completed':
        return 'bg-success';
      case 'failed':
        return 'bg-danger';
      case 'canceled':
        return 'bg-warning';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="bulk-progress">
      <h4>
        Job Status: <span className={getStatusClass()}>{getStatusLabel()}</span>
      </h4>

      <div className="progress-track">
        <div className={`progress-fill ${getProgressClass()}`} style={{ width: `${progress}%` }} />
      </div>

      <div className="progress-stats mt-2">
        <p className="mb-1">Total: {job.totalFiles}</p>
        <p className="mb-1">Uploaded: {job.uploadedCount || 0}</p>
        <p className="mb-1">Duplicates: {job.duplicateCount || 0}</p>
        <p className="mb-1">Errors: {job.errorCount || 0}</p>
        <p className="mb-1">Skipped: {job.skippedCount || 0}</p>
      </div>

      {job.status === 'completed' && (
        <div className="alert alert-success mt-2">✓ Import completed successfully!</div>
      )}

      {job.status === 'failed' && (
        <div className="alert alert-danger mt-2">✗ Import failed. Please try again.</div>
      )}
    </div>
  );
};
