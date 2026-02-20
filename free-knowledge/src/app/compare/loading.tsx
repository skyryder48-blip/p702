export default function CompareLoading() {
  return (
    <div className="page">
      <div className="container">
        <div className="skeleton skeleton-heading" style={{ width: '50%' }} />
        <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: 'var(--space-xl)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          <div className="skeleton skeleton-card" style={{ height: 200 }} />
          <div className="skeleton skeleton-card" style={{ height: 200 }} />
        </div>
      </div>
    </div>
  );
}
