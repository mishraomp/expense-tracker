import {
  exchangeDriveCode,
  getDriveAuthorizeUrl,
  getDriveStatus,
  revokeDriveAccess,
} from '@/services/api';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface DriveState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastUpdated: number | null;
  checkStatus: () => Promise<boolean>;
  beginConnect: () => Promise<void>;
  handleCallback: (code: string) => Promise<boolean>;
  revoke: () => Promise<boolean>;
}

// Deduplication: track in-flight request and cache TTL (5 seconds)
let pendingStatusCheck: Promise<boolean> | null = null;
const STATUS_CACHE_TTL_MS = 5000;

export const useDriveStore = create<DriveState>()(
  devtools(
    (set, get) => ({
      connected: false,
      connecting: false,
      error: null,
      lastUpdated: null,

      checkStatus: async () => {
        const { lastUpdated } = get();

        // Return cached result if still fresh
        if (lastUpdated && Date.now() - lastUpdated < STATUS_CACHE_TTL_MS) {
          return get().connected;
        }

        // Return existing in-flight request to avoid duplicates
        if (pendingStatusCheck) {
          return pendingStatusCheck;
        }

        // Create new request and track it
        pendingStatusCheck = (async () => {
          try {
            const connected = await getDriveStatus();
            set({ connected, lastUpdated: Date.now(), error: null });
            return connected;
          } catch (e) {
            set({ error: (e as Error).message });
            return false;
          } finally {
            pendingStatusCheck = null;
          }
        })();

        return pendingStatusCheck;
      },

      beginConnect: async () => {
        set({ connecting: true, error: null });
        try {
          const url = await getDriveAuthorizeUrl();
          window.location.href = url; // redirect to Google consent
        } catch (e) {
          set({ error: (e as Error).message, connecting: false });
        }
      },

      handleCallback: async (code: string) => {
        set({ connecting: true, error: null });
        try {
          const resp = await exchangeDriveCode(code);
          if (resp.data.accessToken) {
            set({ connected: true, connecting: false, lastUpdated: Date.now() });
            return true;
          }
          set({ connecting: false, error: 'No access token in response' });
          return false;
        } catch (e) {
          set({ error: (e as Error).message, connecting: false });
          return false;
        }
      },

      revoke: async () => {
        try {
          const success = await revokeDriveAccess();
          if (success) {
            set({ connected: false, lastUpdated: Date.now() });
          }
          return success;
        } catch (e) {
          set({ error: (e as Error).message });
          return false;
        }
      },
    }),
    { name: 'drive-store' },
  ),
);
