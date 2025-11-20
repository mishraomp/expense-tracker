export function NotFound() {
  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 text-center">
          <h1 className="display-1">404</h1>
          <h2 className="mb-4">Page Not Found</h2>
          <p className="text-muted mb-4">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <a href="/" className="btn btn-primary">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
