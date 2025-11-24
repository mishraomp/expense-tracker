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
      <p className="hint">
        Optionally map each file to a specific {recordType} record. Files without mapping will be
        skipped.
      </p>

      <div className="mapping-list">
        {files.map((file, index) => (
          <div key={index} className="mapping-row">
            <span className="file-name">{file.name}</span>
            <input
              type="text"
              placeholder={`${recordType} ID (optional)`}
              value={recordIds[index] || ''}
              onChange={(e) => onMappingChange(index, e.target.value || undefined)}
              style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
