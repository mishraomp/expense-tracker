import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ImportSession, UploadFileResponse, FullImportSummary } from '../types/import.types';
import api from '../../../services/api';

/**
 * Upload a CSV or Excel file for import
 */
async function uploadFile(file: File): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append('file', file);

  // Override default JSON header to allow multipart form data
  const response = await api.post('import/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const session = response.data;
  if (!session || !session.id) {
    throw new Error('Failed to upload file');
  }
  // Backend returns the session object directly; wrap to match client type
  return { session };
}

/**
 * Fetch import session status
 */
async function fetchImportSession(sessionId: string): Promise<ImportSession> {
  const response = await api.get(`import/${sessionId}`);

  if (!response.data) {
    throw new Error('Failed to fetch import session');
  }

  return response.data;
}

/**
 * Hook: Upload file mutation
 */
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      // Invalidate expenses query to refresh list after successful import
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

/**
 * Hook: Fetch import session with polling
 */
export function useImportSession(sessionId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['importSession', sessionId],
    queryFn: () => fetchImportSession(sessionId!),
    enabled: enabled && !!sessionId,
    refetchInterval: (query) => {
      // Poll every 2 seconds if status is 'processing'
      const data = query.state.data;
      return data?.status === 'processing' ? 2000 : false;
    },
  });
}

/**
 * Download full dataset export (ZIP of CSVs)
 */
export async function downloadFullExport(): Promise<Blob> {
  const res = await api.get('export/full', { responseType: 'blob' });
  return res.data as Blob;
}

/**
 * Upload full dataset ZIP for import
 */
export async function uploadFullDatasetZip(file: File): Promise<FullImportSummary> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('import/full', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as FullImportSummary;
}
