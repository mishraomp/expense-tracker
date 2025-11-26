import type { ErrorDetail } from '../types/import.types';

interface ImportErrorListProps {
  errors: ErrorDetail[];
}

export function ImportErrorList({ errors }: ImportErrorListProps) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="h6 text-danger mb-2">Validation Errors ({errors.length})</h4>
      <div className="border border-danger-subtle rounded">
        <div className="table-responsive error-list-scroll">
          <table className="table table-sm mb-0 align-middle">
            <thead className="table-danger sticky-top">
              <tr>
                <th scope="col" className="text-start">
                  Row
                </th>
                <th scope="col" className="text-start">
                  Errors
                </th>
              </tr>
            </thead>
            <tbody>
              {errors.map((error, index) => (
                <tr key={index}>
                  <td className="fw-semibold text-danger">{error.row}</td>
                  <td>
                    <ul className="mb-0 ps-3">
                      {error.errors.map((err, errIndex) => (
                        <li key={errIndex}>{err}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
