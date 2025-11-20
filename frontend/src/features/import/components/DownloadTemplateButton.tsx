export function DownloadTemplateButton() {
  const handleDownload = () => {
    // Updated template to reflect data model: optional subcategory column
    // Accepted date formats: MM/DD/YYYY or YYYY-MM-DD
    // Category and Subcategory should be provided by NAME (case-insensitive match)
    const headers = ['date', 'amount', 'description', 'category', 'subcategory'];
    const sampleData = [
      ['2024-01-15', '45.50', 'Grocery shopping', 'Food', 'Groceries'],
      ['2024-01-16', '120.00', 'Electric bill', 'Utilities', 'Electricity'],
      ['2024-01-17', '25.99', 'Movie night', 'Entertainment', 'Movies'],
      // Example with no subcategory
      ['2024-01-18', '12.00', 'Coffee', 'Food', ''],
    ];

    const csvContent = [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'expense-import-template.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleDownload} className="btn btn-outline-secondary">
      <i className="bi bi-download me-2" aria-hidden="true"></i>
      Download Template
    </button>
  );
}
