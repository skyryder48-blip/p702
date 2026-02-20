'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [zipCode, setZipCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = zipCode.trim();
    if (!/^\d{5}$/.test(trimmed)) {
      setError('Please enter a valid 5-digit zip code.');
      return;
    }

    router.push(`/reps?zip=${trimmed}`);
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '720px', textAlign: 'center' }}>
        <div style={{ padding: 'var(--space-3xl) 0' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>
            Know Your Representatives
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--color-ink-muted)', marginBottom: 'var(--space-2xl)' }}>
            Transparent civic intelligence. See voting records, campaign finance,
            and legislative history for your elected officials.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--space-md)', maxWidth: '480px', margin: '0 auto' }}>
            <input
              type="text"
              className="input input-lg"
              placeholder="Enter your zip code"
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
              maxLength={5}
              pattern="\d{5}"
              inputMode="numeric"
              aria-label="Zip code"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary btn-lg">
              Find Reps
            </button>
          </form>

          {error && (
            <p style={{ color: 'var(--color-nay)', marginTop: 'var(--space-md)' }}>{error}</p>
          )}

          <p className="text-muted text-sm" style={{ marginTop: 'var(--space-lg)' }}>
            Try 60188 (Carol Stream, IL) or 10001 (New York, NY)
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2xl)', marginTop: 'var(--space-xl)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', textAlign: 'left' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Voting Records</h3>
              <p className="text-muted text-sm">See how your representatives vote on the issues that matter to you.</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Campaign Finance</h3>
              <p className="text-muted text-sm">Follow the money. See who funds your representatives&apos; campaigns.</p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Legislation</h3>
              <p className="text-muted text-sm">Track bills sponsored and cosponsored by your elected officials.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
