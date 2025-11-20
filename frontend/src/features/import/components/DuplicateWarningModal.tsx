import { createPortal } from 'react-dom';
import type { ErrorDetail } from '../types/import.types';

interface DuplicateWarningModalProps {
  duplicates: ErrorDetail[];
  onClose: () => void;
}

export function DuplicateWarningModal({ duplicates, onClose }: DuplicateWarningModalProps) {
  if (duplicates.length === 0) return null;

  return createPortal(
    <>
      <div className="modal show d-block" style={{ zIndex: 1055 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header bg-warning-subtle border-0">
              <h5 className="modal-title d-flex align-items-center">
                <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
                Potential Duplicates Detected
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="mb-3">
                {duplicates.length} row{duplicates.length > 1 ? 's' : ''} may be duplicates. The
                following rows were imported but may already exist. Review and delete as needed.
              </p>
              <div className="alert alert-warning" role="alert">
                Verify dates, amounts, and descriptions to avoid double-counting.
              </div>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Row</th>
                      <th scope="col">Warning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.map((duplicate, index) => (
                      <tr key={index}>
                        <td className="fw-semibold">{duplicate.row}</td>
                        <td>
                          <ul className="mb-0">
                            {duplicate.errors.map((error, errIndex) => (
                              <li key={errIndex}>{error}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer border-0">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                I Understand
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" style={{ zIndex: 1050 }}></div>
    </>,
    document.body,
  );
}
