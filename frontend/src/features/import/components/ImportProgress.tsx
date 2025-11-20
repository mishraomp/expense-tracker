import type { ImportSession } from '../types/import.types';

interface ImportProgressProps {
  session: ImportSession;
}

export function ImportProgress({ session }: ImportProgressProps) {
  const { status, totalRows, successfulRows, failedRows } = session;

  const progressPercentage =
    totalRows && totalRows > 0 ? ((successfulRows || 0) / totalRows) * 100 : 0;

  const isProcessing = status === 'processing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  const total = totalRows ?? 0;
  const success = successfulRows ?? 0;
  const failed = failedRows ?? 0;
  const duplicatesSkipped = Math.max(0, total - success - failed);

  return (
    <div className="container px-0">
      {/* Status Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="h5 mb-0">Import Status</h3>
        <span
          className={`badge rounded-pill ${
            isProcessing ? 'text-bg-primary' : isCompleted ? 'text-bg-success' : 'text-bg-danger'
          }`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Progress Bar */}
      {totalRows !== null && (
        <div className="mb-2">
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`progress-bar ${
                isCompleted ? 'bg-success' : isProcessing ? 'bg-primary' : 'bg-danger'
              }`}
              style={{ width: `${progressPercentage}%` }}
              aria-valuenow={progressPercentage}
            />
          </div>
          <div className="small text-muted text-center mt-1">
            {Math.round(progressPercentage)}% Complete
          </div>
        </div>
      )}

      {/* Statistics */}
      <div
        className={`row g-3 pt-3 text-center ${
          duplicatesSkipped > 0 ? 'row-cols-1 row-cols-sm-4' : 'row-cols-1 row-cols-sm-3'
        }`}
      >
        <div className="col">
          <div className="fs-4 fw-bold">{totalRows ?? '-'}</div>
          <div className="small text-muted">Total Rows</div>
        </div>
        <div className="col">
          <div className="fs-4 fw-bold text-success">{successfulRows ?? '-'}</div>
          <div className="small text-muted">Successful</div>
        </div>
        <div className="col">
          <div className="fs-4 fw-bold text-danger">{failedRows ?? '-'}</div>
          <div className="small text-muted">Failed</div>
        </div>
        {duplicatesSkipped > 0 && (
          <div className="col">
            <div className="fs-4 fw-bold text-warning">{duplicatesSkipped}</div>
            <div className="small text-muted">Skipped (duplicates)</div>
          </div>
        )}
      </div>

      {/* Completion Message */}
      {isCompleted && (
        <div className="alert alert-success mt-3" role="status" aria-live="polite">
          <p className="mb-1">✅ Import completed successfully!</p>
          {duplicatesSkipped > 0 && (
            <p className="small mb-1">
              {duplicatesSkipped} duplicate row
              {duplicatesSkipped > 1 ? 's were' : ' was'} automatically skipped.
            </p>
          )}
          {failed > 0 && (
            <p className="small mb-0">
              {failed} row{failed > 1 ? 's' : ''} failed validation. See errors below.
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {isFailed && (
        <div className="alert alert-danger mt-3" role="alert" aria-live="assertive">
          <p className="mb-1">❌ Import failed</p>
          <p className="small mb-0">
            An error occurred while processing your file. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
