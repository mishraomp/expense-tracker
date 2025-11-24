import { useDriveStore } from '@/stores/drive';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/drive-callback')({
  component: CallbackPage,
});

function CallbackPage() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const errorParam = params.get('error');
  const { handleCallback } = useDriveStore();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('Processing authorization...');

  useEffect(() => {
    async function run() {
      if (errorParam) {
        setStatus('error');
        setMessage(`Authorization error: ${errorParam}`);
        return;
      }
      if (!code) {
        setStatus('error');
        setMessage('Missing authorization code');
        return;
      }
      const ok = await handleCallback(code);
      if (ok) {
        setStatus('success');
        setMessage('Google Drive connected. You can close this tab.');
        // Redirect back after short delay
        setTimeout(() => {
          window.location.replace('/');
        }, 1500);
      } else {
        setStatus('error');
        setMessage('Failed to complete Drive connection.');
      }
    }
    void run();
  }, [code, errorParam, handleCallback]);

  return (
    <div className="container py-4">
      <h3>Google Drive Connection</h3>
      <p>{message}</p>
      {status === 'pending' && <div className="spinner-border" role="status" />}
      {status === 'success' && <div className="alert alert-success">Success!</div>}
      {status === 'error' && <div className="alert alert-danger">Error connecting to Drive.</div>}
    </div>
  );
}
