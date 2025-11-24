import { useDriveStore } from '@/stores/drive';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/oauth/callback')({
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const errorParam = params.get('error');
  const stateParam = params.get('state');
  const { handleCallback } = useDriveStore();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('Processing Google authorization...');

  useEffect(() => {
    void (async () => {
      // Basic CSRF mitigation: if state was issued we could validate it here (placeholder)
      if (errorParam) {
        setStatus('error');
        setMessage(`Authorization error: ${errorParam}`);
        return;
      }
      if (!code) {
        setStatus('error');
        setMessage('Missing authorization code.');
        return;
      }
      try {
        const ok = await handleCallback(code);
        if (ok) {
          setStatus('success');
          setMessage('Google Drive connected successfully. Redirecting...');
          setTimeout(() => navigate({ to: '/' }), 1200);
        } else {
          setStatus('error');
          setMessage('Failed to exchange authorization code.');
        }
      } catch (e) {
        setStatus('error');
        setMessage((e as Error).message || 'Unexpected error during callback.');
      }
    })();
  }, [code, errorParam, stateParam, handleCallback, navigate]);

  return (
    <div className="container py-5" style={{ maxWidth: 560 }}>
      <h3 className="mb-3">Google Drive Connection</h3>
      <p className="text-muted mb-4">{message}</p>
      {status === 'pending' && (
        <div className="d-flex align-items-center gap-3">
          <div className="spinner-border" role="status" />
          <span>Authorizing...</span>
        </div>
      )}
      {status === 'success' && <div className="alert alert-success">Connected!</div>}
      {status === 'error' && (
        <div className="alert alert-danger">
          <strong>Drive connection failed.</strong>
          <div className="small mt-2">Ensure you granted consent and are logged in.</div>
        </div>
      )}
    </div>
  );
}

export default OAuthCallbackPage;
