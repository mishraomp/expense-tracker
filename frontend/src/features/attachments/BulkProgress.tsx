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

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'canceled':
        return 'orange';
      default:
        return 'blue';
    }
  };

  return (
    <div className="bulk-progress">
      <h4>
        Job Status: <span style={{ color: getStatusColor() }}>{getStatusLabel()}</span>
      </h4>

      <div
        className="progress-bar"
        style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px', height: '20px' }}
      >
        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
            backgroundColor: getStatusColor(),
            height: '100%',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div className="progress-stats">
        <p>Total: {job.totalFiles}</p>
        <p>Uploaded: {job.uploadedCount || 0}</p>
        <p>Duplicates: {job.duplicateCount || 0}</p>
        <p>Errors: {job.errorCount || 0}</p>
        <p>Skipped: {job.skippedCount || 0}</p>
      </div>

      {job.status === 'completed' && (
        <div className="completion-message">✓ Import completed successfully!</div>
      )}

      {job.status === 'failed' && (
        <div className="error-message">✗ Import failed. Please try again.</div>
      )}
    </div>
  );
};
