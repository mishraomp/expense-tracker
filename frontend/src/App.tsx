import { Routes, Route, Link } from 'react-router-dom';
//
import ExpensesPage from './features/expenses/pages/ExpensesPage';
import { ImportPage } from './features/import/pages/ImportPage';
import { ReportsPage } from './features/reports/pages/ReportsPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { useKeycloak } from './features/auth/keycloakContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const { keycloak, initialized, authenticated } = useKeycloak();

  // API layer reads token from auth store; no direct keycloak wiring needed here

  if (!initialized) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid">
        <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4">
          <div className="container-fluid">
            <Link className="navbar-brand" to="/">
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
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <Link className="nav-link" to="/expenses">
                    Expenses
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/reports">
                    Reports
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/categories">
                    Categories
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/import">
                    Import
                  </Link>
                </li>
              </ul>
              {authenticated && (
                <ul className="navbar-nav ms-auto">
                  <li className="nav-item">
                    <button className="btn btn-link nav-link" onClick={() => keycloak?.logout()}>
                      Logout
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <div>Categories - Coming in Phase 5</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/import"
            element={
              <ProtectedRoute>
                <ImportPage />
              </ProtectedRoute>
            }
          />
        </Routes>
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

export default App;
