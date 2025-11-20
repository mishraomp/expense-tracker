/**
 * Import Session Status
 */
export type ImportSessionStatus = 'processing' | 'completed' | 'failed';

/**
 * Error detail for a specific row
 */
export interface ErrorDetail {
  row: number;
  errors: string[];
}

/**
 * Import Session (matches backend DTO)
 */
export interface ImportSession {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  totalRows: number | null;
  successfulRows: number | null;
  failedRows: number | null;
  errorDetails: ErrorDetail[] | null;
  status: ImportSessionStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * File Upload Status (local UI state)
 */
export type FileUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Upload File Response
 */
export interface UploadFileResponse {
  session: ImportSession;
}

/**
 * Full dataset import summary response
 */
export interface FullImportSummary {
  categoriesCreated: number;
  categoriesUpdated: number;
  subcategoriesUpserted: number;
  expensesCreated: number;
}
