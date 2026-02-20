export default function DashboardLoading() {
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="skeleton skeleton-heading" style={{ width: '40%' }} />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" style={{ height: 180 }} />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  );
}
