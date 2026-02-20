export default function RepsLoading() {
  return (
    <div className="page">
      <div className="container">
        <div className="skeleton skeleton-heading" style={{ width: '50%' }} />
        <div className="skeleton skeleton-text" style={{ width: '30%', marginBottom: 'var(--space-xl)' }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
