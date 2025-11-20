import CategoryList from '../components/CategoryList';

export default function CategoriesPage() {
  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Categories</h1>
          <p className="text-muted">Manage predefined and your custom categories</p>
        </div>
      </div>
      <CategoryList />
    </div>
  );
}
