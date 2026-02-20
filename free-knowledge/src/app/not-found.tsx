import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page">
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
        <h1>Page Not Found</h1>
        <p className="text-muted" style={{ margin: 'var(--space-lg) 0' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to Search
        </Link>
      </div>
    </div>
  );
}
