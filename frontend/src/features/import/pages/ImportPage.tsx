import { useState, useEffect } from 'react';
import {
  useUploadFile,
  useImportSession,
  downloadFullExport,
  uploadFullDatasetZip,
} from '../api/importApi';
import { FileUploadForm } from '../components/FileUploadForm';
import { ImportProgress } from '../components/ImportProgress';
import { ImportErrorList } from '../components/ImportErrorList';
import { DownloadTemplateButton } from '../components/DownloadTemplateButton';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';

export function ImportPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFullImporting, setIsFullImporting] = useState(false);
  const uploadMutation = useUploadFile();
  const { data: session } = useImportSession(sessionId, !!sessionId);

  // Determine if there are duplicate warnings
  const duplicateWarnings =
    session?.errorDetails?.filter((detail) =>
      detail.errors.some((err) => err.toLowerCase().includes('duplicate')),
    ) || [];

  const validationErrors =
    session?.errorDetails?.filter(
      (detail) => !detail.errors.some((err) => err.toLowerCase().includes('duplicate')),
    ) || [];

  // Auto-show modal when duplicates detected and import completes
  const hasDuplicates = duplicateWarnings.length > 0;
  const shouldShowModal = showDuplicateModal && hasDuplicates && session?.status === 'completed';

  // Trigger modal on completion with duplicates
  useEffect(() => {
    if (session?.status === 'completed' && hasDuplicates && !showDuplicateModal) {
      // Use setTimeout to avoid synchronous state update in effect
      setTimeout(() => setShowDuplicateModal(true), 0);
    }
  }, [session?.status, hasDuplicates, showDuplicateModal]);

  const handleFileSelect = async (file: File) => {
    try {
      const response = await uploadMutation.mutateAsync(file);
      setSessionId(response.session.id);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload file. Please try again.');
    }
  };

  const handleStartNewImport = () => {
    setSessionId(null);
    uploadMutation.reset();
  };

  const handleDownloadExport = async () => {
    try {
      setIsExporting(true);
      const blob = await downloadFullExport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFullImportSelect = async (file: File) => {
    try {
      setIsFullImporting(true);
      const summary = await uploadFullDatasetZip(file);
      alert(
        `Import complete\nCategories created: ${summary.categoriesCreated}\nCategories updated: ${summary.categoriesUpdated}\nSubcategories upserted: ${summary.subcategoriesUpserted}\nExpenses created: ${summary.expensesCreated}`,
      );
    } catch {
      alert('Full dataset import failed.');
    } finally {
      setIsFullImporting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="col-12 col-lg-10 col-xl-8 mx-auto">
        <h1 className="h3 fw-bold mb-2">Import / Export</h1>
        <p className="text-muted mb-4">Export your whole dataset or import from files.</p>

        <div className="card mb-4">
          <div className="card-body d-flex flex-column flex-md-row gap-2">
            <button
              className="btn btn-outline-primary"
              onClick={handleDownloadExport}
              disabled={isExporting}
            >
              {isExporting ? 'Preparing export…' : 'Export All Data (ZIP)'}
            </button>
            <div className="flex-grow-1">
              <label className="form-label mb-1">Import Full Dataset (ZIP)</label>
              <input
                type="file"
                className="form-control"
                accept=".zip"
                disabled={isFullImporting}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFullImportSelect(f);
                  e.currentTarget.value = '';
                }}
              />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <DownloadTemplateButton />
        </div>

        {!session && (
          <FileUploadForm onFileSelect={handleFileSelect} isUploading={uploadMutation.isPending} />
        )}

        {session && (
          <div className="mt-4">
            <ImportProgress session={session} />

            {validationErrors.length > 0 && <ImportErrorList errors={validationErrors} />}

            {(session.status === 'completed' || session.status === 'failed') && (
              <div className="d-flex justify-content-center mt-4">
                <button type="button" onClick={handleStartNewImport} className="btn btn-primary">
                  Import Another File
                </button>
              </div>
            )}
          </div>
        )}

        {/* Duplicate Warning Modal */}
        {shouldShowModal && (
          <DuplicateWarningModal
            duplicates={duplicateWarnings}
            onClose={() => setShowDuplicateModal(false)}
          />
        )}
      </div>
    </div>
  );
}
