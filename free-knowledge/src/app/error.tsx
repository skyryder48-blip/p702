'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="page">
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
        <h1>Something went wrong</h1>
        <p className="text-muted" style={{ margin: 'var(--space-lg) 0' }}>
          We encountered an unexpected error. This has been logged and we&apos;ll look into it.
        </p>
        <button onClick={reset} className="btn btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}
