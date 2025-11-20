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

export default api;
