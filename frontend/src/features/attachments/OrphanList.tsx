import React, { useState, useEffect } from 'react';
import { getOrphans } from '../../services/api';

interface Orphan {
  driveFileId: string;
  originalFilename: string;
  sizeBytes: number;
  detectedAt: string;
}

export const OrphanList: React.FC = () => {
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getOrphans();
      setOrphans(result);
    } catch (err) {
      console.error('Failed to scan orphans:', err);
      setError('Failed to scan for orphan files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleScan();
  }, []);

  return (
    <div className="orphan-list">
      <h3>Orphan Files</h3>
      <p className="description">
        These files exist in Google Drive but are not linked to any expense or income record.
      </p>

      <button onClick={handleScan} disabled={isLoading}>
        {isLoading ? 'Scanning...' : 'Refresh'}
      </button>

      {error && <div className="error-message">{error}</div>}

      {orphans.length === 0 && !isLoading && (
        <div className="no-orphans">No orphan files found.</div>
      )}

      {orphans.length > 0 && (
        <div className="orphan-items">
          <p>Found {orphans.length} orphan file(s):</p>
          <ul>
            {orphans.map((orphan) => (
              <li key={orphan.driveFileId}>
                <strong>{orphan.originalFilename}</strong>
                <span> ({(orphan.sizeBytes / 1024).toFixed(2)} KB)</span>
                <span className="detected-at">
                  {' '}
                  - Detected: {new Date(orphan.detectedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
