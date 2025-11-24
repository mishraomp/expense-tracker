import { useEffect, useRef } from 'react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: {
    id: string;
    originalFilename: string;
    mimeType: string;
    webViewLink: string;
  } | null;
}

export default function PreviewModal({ isOpen, onClose, attachment }: PreviewModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !attachment) return null;

  const isPDF = attachment.mimeType === 'application/pdf';
  const isImage = attachment.mimeType.startsWith('image/');

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-xl" ref={modalRef}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="preview-modal-title">
              {attachment.originalFilename}
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close preview"
              onClick={onClose}
              ref={closeButtonRef}
            ></button>
          </div>
          <div className="modal-body" style={{ minHeight: '500px' }}>
            {isPDF && (
              <iframe
                src={`${attachment.webViewLink}#embedded=true`}
                style={{ width: '100%', height: '600px', border: 'none' }}
                title={`Preview of ${attachment.originalFilename}`}
              />
            )}
            {isImage && (
              <div className="text-center">
                <img
                  src={attachment.webViewLink}
                  alt={attachment.originalFilename}
                  style={{ maxWidth: '100%', maxHeight: '600px' }}
                  className="img-fluid"
                />
              </div>
            )}
            {!isPDF && !isImage && (
              <div className="alert alert-info">
                <p>Preview not available for this file type.</p>
                <a
                  href={attachment.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Open in Google Drive
                </a>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <a
              href={attachment.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Open in New Tab
            </a>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
