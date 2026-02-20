export default function IssuesLoading() {
  return (
    <div className="page">
      <div className="container">
        <div className="skeleton skeleton-heading" style={{ width: '40%' }} />
        <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 'var(--space-xl)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--border-radius-lg)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
