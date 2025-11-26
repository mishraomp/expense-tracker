import { Link } from '@tanstack/react-router';
import { type ReactNode, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, username, logout, userInfo } = useAuthStore();
  const [showUserModal, setShowUserModal] = useState(false);

  const initials = useMemo(() => {
    const name = username() || '';
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join('') || '?'
    );
  }, [username]);

  return (
    <>
      <div>
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-2">
          <div className="container-fluid px-3 px-lg-4">
            <Link to="/" className="navbar-brand">
              Expense Tracker
            </Link>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div
              className="collapse navbar-collapse d-flex justify-content-between align-items-center"
              id="navbarNav"
            >
              <ul className="navbar-nav">
                <li className="nav-item">
                  <Link to="/expenses" className="nav-link" activeProps={{ className: 'active' }}>
                    Expenses
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/incomes" className="nav-link" activeProps={{ className: 'active' }}>
                    Income
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/reports" className="nav-link" activeProps={{ className: 'active' }}>
                    Reports
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/categories" className="nav-link" activeProps={{ className: 'active' }}>
                    Categories
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/tags" className="nav-link" activeProps={{ className: 'active' }}>
                    Tags
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/import" className="nav-link" activeProps={{ className: 'active' }}>
                    Import
                  </Link>
                </li>
              </ul>
              {isAuthenticated && (
                <div className="d-flex align-items-center ms-auto gap-3">
                  <button
                    type="button"
                    className="btn btn-outline-light d-flex align-items-center px-2 py-1"
                    onClick={() => setShowUserModal(true)}
                    title={username()}
                  >
                    <span className="rounded-circle bg-light text-primary fw-bold d-inline-flex justify-content-center align-items-center me-2 avatar-sm">
                      {initials}
                    </span>
                    <span className="text-light small">{username()}</span>
                  </button>
                  <button className="btn btn-light btn-sm text-primary" onClick={() => logout()}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <main>
          <div className="container-fluid px-3 px-lg-4">{children}</div>
        </main>
        {isAuthenticated && showUserModal && (
          <>
            <div className="modal fade show d-block" role="dialog">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Account</h5>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={() => setShowUserModal(false)}
                    />
                  </div>
                  <div className="modal-body">
                    <div className="d-flex align-items-center mb-3">
                      <span className="rounded-circle bg-primary text-light fw-bold d-inline-flex justify-content-center align-items-center me-3 avatar-md">
                        {initials}
                      </span>
                      <div>
                        <div className="fw-semibold">
                          {userInfo.displayName || userInfo.username}
                        </div>
                        <div className="text-muted small">{userInfo.email}</div>
                      </div>
                    </div>
                    {userInfo.roles && userInfo.roles.length > 0 && (
                      <div className="mb-2">
                        <div className="fw-semibold mb-1">Roles</div>
                        <div className="d-flex flex-wrap gap-2">
                          {userInfo.roles.map((r) => (
                            <span key={r} className="badge text-bg-secondary">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setShowUserModal(false)}
                    >
                      Close
                    </button>
                    <button className="btn btn-primary" onClick={() => logout()}>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" onClick={() => setShowUserModal(false)} />
          </>
        )}
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
}
