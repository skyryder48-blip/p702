'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCivicsAuth } from '@/core/auth/use-civics-auth';

const TIER_FEATURES = [
  { label: 'Profile overview, biography, contact', free: 'Open', premium: 'Open', institutional: 'Open' },
  { label: 'Sponsored bills', free: '5 most recent', premium: 'All', institutional: 'All' },
  { label: 'Recent votes', free: '5 most recent', premium: 'Full history', institutional: 'Full history' },
  { label: 'Committee assignments', free: 'List only', premium: 'Full details', institutional: 'Full details' },
  { label: 'Recent news', free: '3 articles', premium: 'Full archive', institutional: 'Full archive' },
  { label: 'Campaign finance', free: '\u2014', premium: 'Full data', institutional: 'Full data' },
  { label: 'Performance metrics', free: '\u2014', premium: 'Full dashboard', institutional: 'Full dashboard' },
  { label: 'Compare officials', free: '\u2014', premium: 'Side-by-side', institutional: 'Side-by-side' },
  { label: 'Issue reports', free: 'Category list', premium: 'Full reports', institutional: 'Full reports' },
  { label: 'Saved officials & alerts', free: 'Save only', premium: 'Save + alerts', institutional: 'Save + alerts' },
  { label: 'PDF / CSV export', free: '\u2014', premium: 'PDF', institutional: 'PDF + CSV + API' },
];

export default function UpgradePage() {
  const { tier, isAuthenticated } = useCivicsAuth();
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const isPremium = tier === 'premium' || tier === 'institutional';

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h1 style={{ marginBottom: 'var(--space-sm)' }}>Unlock the full picture</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-ink-muted)', maxWidth: 600, margin: '0 auto' }}>
            free-civics premium gives you deeper access to civic data — full voting records,
            campaign finance, performance metrics, and more.
          </p>
        </div>

        {/* Current tier badge */}
        {isAuthenticated && (
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <span style={{
              display: 'inline-block',
              padding: 'var(--space-xs) var(--space-md)',
              background: isPremium ? 'var(--color-gold)' : 'var(--color-parchment-dark)',
              color: isPremium ? 'white' : 'var(--color-ink)',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 600,
            }}>
              Your plan: {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>
          </div>
        )}

        {/* Tier Comparison Table */}
        <div className="card" style={{ marginBottom: 'var(--space-2xl)', overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Feature</th>
                <th style={{ textAlign: 'center' }}>Free</th>
                <th style={{ textAlign: 'center', color: 'var(--color-gold-dark)' }}>Premium</th>
                <th style={{ textAlign: 'center' }}>Institutional</th>
              </tr>
            </thead>
            <tbody>
              {TIER_FEATURES.map((feat, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{feat.label}</td>
                  <td style={{ textAlign: 'center' }} className="text-sm">{feat.free}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }} className="text-sm">{feat.premium}</td>
                  <td style={{ textAlign: 'center' }} className="text-sm">{feat.institutional}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Waitlist / Early Access */}
        {!isPremium && (
          <div className="card" style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Early Access</h3>
            <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
              Premium is coming soon. Join the waitlist to be the first to know.
            </p>

            {waitlistSubmitted ? (
              <p style={{ color: 'var(--color-yea)', fontWeight: 600 }}>
                You&apos;re on the list. We&apos;ll notify you when premium launches.
              </p>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setWaitlistSubmitted(true);
                }}
                style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}
              >
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  required
                  style={{ maxWidth: 280 }}
                />
                <button type="submit" className="btn btn-gold">Join Waitlist</button>
              </form>
            )}
          </div>
        )}

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-2xl)' }}>
          <Link href="/" className="text-sm">&larr; Back to free-civics</Link>
        </div>
      </div>
    </div>
  );
}
