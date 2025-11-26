import React from 'react';

interface BulkMappingSuggestionsProps {
  files: File[];
  recordType: 'expense' | 'income';
  recordIds: (string | undefined)[];
  onMappingChange: (fileIndex: number, recordId: string | undefined) => void;
}

export const BulkMappingSuggestions: React.FC<BulkMappingSuggestionsProps> = ({
  files,
  recordType,
  recordIds,
  onMappingChange,
}) => {
  return (
    <div className="bulk-mapping-suggestions">
      <h4>File Mapping</h4>
      <p className="hint text-muted small">
        Optionally map each file to a specific {recordType} record. Files without mapping will be
        skipped.
      </p>

      <div className="mapping-list">
        {files.map((file, index) => (
          <div key={index} className="mapping-row d-flex align-items-center mb-2">
            <span className="file-name text-truncate">{file.name}</span>
            <input
              type="text"
              className="form-control form-control-sm mapping-input"
              placeholder={`${recordType} ID (optional)`}
              value={recordIds[index] || ''}
              onChange={(e) => onMappingChange(index, e.target.value || undefined)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
