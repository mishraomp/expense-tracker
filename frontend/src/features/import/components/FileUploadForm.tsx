import { useCallback, useState } from 'react';

interface FileUploadFormProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

export function FileUploadForm({ onFileSelect, isUploading }: FileUploadFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExtensions = ['.csv', '.xlsx', '.xls'];

    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExtension) {
      alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return false;
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (validateFile(file)) {
          setSelectedFileName(file.name);
          onFileSelect(file);
        }
      }
    },
    [onFileSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (validateFile(file)) {
          setSelectedFileName(file.name);
          onFileSelect(file);
        }
      }
    },
    [onFileSelect],
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <form
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          id="file-upload"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="space-y-4">
            <div className="text-6xl">📁</div>
            <div className="text-lg font-medium text-gray-700">
              {selectedFileName || 'Drop your file here or click to browse'}
            </div>
            <div className="text-sm text-gray-500">
              Supports CSV and Excel files (.csv, .xlsx, .xls)
            </div>
            <div className="text-sm text-gray-400">Maximum file size: 10MB</div>
          </div>
        </label>
      </form>

      {isUploading && (
        <div className="mt-4 text-center text-blue-600">
          <div
            className="animate-spin inline-block w-6 h-6 border-4 border-current border-t-transparent rounded-full"
            role="status"
            aria-label="Uploading file"
          >
            <span className="sr-only">Uploading...</span>
          </div>
          <p className="mt-2">Uploading file...</p>
        </div>
      )}
    </div>
  );
}
