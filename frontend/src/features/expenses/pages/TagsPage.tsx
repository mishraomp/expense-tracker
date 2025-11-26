import TagList from '../components/TagList';

export default function TagsPage() {
  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Tags</h1>
          <p className="text-muted">
            Create and manage tags to organize your expenses across categories
          </p>
        </div>
      </div>
      <TagList />
    </div>
  );
}
