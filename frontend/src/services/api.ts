import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token from auth store
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Track if we're already handling a 401 to prevent infinite loops
let isHandling401 = false;

// Response interceptor: handle 401 (trigger login via auth store)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isHandling401) {
      isHandling401 = true;

      // Try to refresh token first
      const { updateToken, login } = useAuthStore.getState();

      try {
        const refreshed = await updateToken(5);
        if (refreshed) {
          // Token refreshed, retry the original request
          isHandling401 = false;
          return api.request(error.config);
        }
      } catch (refreshError) {
        console.error('Token refresh failed, redirecting to login', refreshError);
      }

      // If refresh failed, trigger login
      login();
      isHandling401 = false;
    }
    return Promise.reject(error);
  },
);

export async function uploadAttachment(formData: FormData) {
  return api.post('/attachments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function listAttachments(recordType: 'expense' | 'income', recordId: string) {
  // All attachment endpoints are namespaced under /attachments for consistency
  return api.get(`/attachments/records/${recordType}/${recordId}/attachments`);
}

export async function replaceAttachment(attachmentId: string, file: File, checksum?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (checksum) {
    formData.append('checksum', checksum);
  }
  return api.put(`/attachments/${attachmentId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function removeAttachment(attachmentId: string) {
  return api.delete(`/attachments/${attachmentId}`);
}

export async function startBulkImport(
  recordType: 'expense' | 'income',
  files: File[],
  recordIds?: (string | undefined)[],
) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('recordType', recordType);
  if (recordIds && recordIds.some((id) => id !== undefined)) {
    recordIds.forEach((id) => {
      if (id !== undefined) {
        formData.append('recordIds', id);
      }
    });
  }

  const response = await api.post('/attachments/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.data; // Returns { jobId, status, totalFiles }
}

export async function getBulkJobStatus(jobId: string) {
  const response = await api.get(`/attachments/bulk/${jobId}`);
  return response.data.data; // Returns job object
}

export async function getOrphans() {
  const response = await api.get('/attachments/orphans');
  return response.data.data.orphans; // Returns orphan array
}

export async function exchangeDriveCode(code: string) {
  return api.post('/drive/oauth/exchange', { code });
}

export async function getDriveAuthorizeUrl() {
  const resp = await api.get('/drive/oauth/authorize');
  return resp.data.url as string;
}

export async function getDriveStatus() {
  const resp = await api.get('/drive/oauth/status');
  return resp.data.connected as boolean;
}

export async function revokeDriveAccess() {
  const resp = await api.delete('/drive/oauth/revoke');
  return resp.data.success as boolean;
}

export default api;
