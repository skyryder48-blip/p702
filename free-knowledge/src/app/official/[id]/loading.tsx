export default function OfficialLoading() {
  return (
    <div className="page">
      <div className="container">
        {/* Hero card skeleton */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-heading" style={{ width: '40%' }} />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 20 }} />
            </div>
          </div>
        </div>
        {/* Tabs skeleton */}
        <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--space-sm)' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton" style={{ width: 80, height: 20 }} />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  );
}
