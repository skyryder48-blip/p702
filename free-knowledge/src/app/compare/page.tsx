'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ComparedOfficial {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: string;
  sponsoredCount: number;
  cosponsoredCount: number;
}

interface FocusComparison {
  issueId: string;
  label: string;
  official1BillCount: number;
  official2BillCount: number;
}

interface ComparisonResult {
  officials: [ComparedOfficial, ComparedOfficial];
  sharedBills: { type: string; number: number; title: string }[];
  votingAlignment?: number;
  fundingComparison: {
    official1: { totalReceipts: number; individualPct: number; pacPct: number };
    official2: { totalReceipts: number; individualPct: number; pacPct: number };
  };
  legislativeFocusComparison: FocusComparison[];
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const a = searchParams.get('a') ?? '';
  const b = searchParams.get('b') ?? '';
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state for selecting officials
  const [idA, setIdA] = useState(a);
  const [idB, setIdB] = useState(b);

  useEffect(() => {
    if (!a || !b) return;

    setLoading(true);
    setError('');

    fetch(`/api/civics/compare?a=${a}&b=${b}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch comparison');
        return res.json();
      })
      .then(data => {
        setComparison(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [a, b]);

  const formatCurrency = (n: number) => `$${n.toLocaleString()}`;
  const partyClass = (party: string) =>
    party.toLowerCase().includes('democrat') ? 'democrat'
      : party.toLowerCase().includes('republican') ? 'republican'
      : 'independent';

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ marginBottom: 'var(--space-lg)' }}>Compare Officials</h1>

        {/* Selection Form */}
        {!a || !b ? (
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
              Enter two bioguide IDs to compare officials side by side.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (idA && idB) {
                  window.location.href = `/compare?a=${idA}&b=${idB}`;
                }
              }}
              style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'end' }}
            >
              <div>
                <label htmlFor="officialA" className="text-sm" style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>
                  Official A (Bioguide ID)
                </label>
                <input
                  id="officialA"
                  type="text"
                  className="input"
                  placeholder="e.g. P000197"
                  value={idA}
                  onChange={e => setIdA(e.target.value.toUpperCase())}
                  pattern="[A-Z]\d{6}"
                  required
                />
              </div>
              <div>
                <label htmlFor="officialB" className="text-sm" style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>
                  Official B (Bioguide ID)
                </label>
                <input
                  id="officialB"
                  type="text"
                  className="input"
                  placeholder="e.g. S000148"
                  value={idB}
                  onChange={e => setIdB(e.target.value.toUpperCase())}
                  pattern="[A-Z]\d{6}"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Compare</button>
            </form>
          </div>
        ) : null}

        {loading && (
          <div>
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        )}

        {error && (
          <div className="card">
            <p style={{ color: 'var(--color-error, #c00)' }}>{error}</p>
          </div>
        )}

        {comparison && (
          <div>
            {/* Header: Two officials side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
              {comparison.officials.map((o, i) => (
                <div key={i} className="card">
                  <Link href={`/official/${o.bioguideId}`} style={{ fontWeight: 600, fontSize: '1.2rem' }}>
                    {o.name}
                  </Link>
                  <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                    {o.chamber === 'senate' ? 'Senator' : 'Representative'} — {o.state}
                  </p>
                  <span className={`party-badge ${partyClass(o.party)}`} style={{ marginTop: 'var(--space-sm)', display: 'inline-block' }}>
                    {o.party}
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                    <div>
                      <p className="text-sm text-muted">Sponsored</p>
                      <p style={{ fontWeight: 700 }}>{o.sponsoredCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Cosponsored</p>
                      <p style={{ fontWeight: 700 }}>{o.cosponsoredCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Voting Alignment */}
            {comparison.votingAlignment !== undefined && (
              <div className="card" style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                <h3 style={{ marginBottom: 'var(--space-sm)' }}>Voting Alignment</h3>
                <p style={{
                  fontSize: '3rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  color: 'var(--color-mahogany)',
                }}>
                  {comparison.votingAlignment}%
                </p>
                <p className="text-sm text-muted">of shared votes where both officials voted the same way</p>
              </div>
            )}

            {/* Funding Comparison */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ marginBottom: 'var(--space-lg)' }}>Funding Comparison</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
                {comparison.officials.map((o, i) => {
                  const fund = i === 0 ? comparison.fundingComparison.official1 : comparison.fundingComparison.official2;
                  return (
                    <div key={i}>
                      <p style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>{o.name}</p>
                      <p className="text-sm text-muted">Total Receipts</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(fund.totalReceipts)}</p>
                      <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-sm)' }}>
                        <div>
                          <p className="text-sm text-muted">Individual</p>
                          <p className="text-sm">{fund.individualPct}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted">PAC</p>
                          <p className="text-sm">{fund.pacPct}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legislative Focus */}
            {comparison.legislativeFocusComparison.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ marginBottom: 'var(--space-lg)' }}>Legislative Focus</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Policy Area</th>
                      <th>{comparison.officials[0].name}</th>
                      <th>{comparison.officials[1].name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.legislativeFocusComparison.slice(0, 10).map(fc => (
                      <tr key={fc.issueId}>
                        <td>{fc.label}</td>
                        <td style={{ textAlign: 'center' }}>{fc.official1BillCount} bills</td>
                        <td style={{ textAlign: 'center' }}>{fc.official2BillCount} bills</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Shared Bills */}
            {comparison.sharedBills.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: 'var(--space-lg)' }}>
                  Shared Sponsored Bills ({comparison.sharedBills.length})
                </h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {comparison.sharedBills.slice(0, 10).map((bill, i) => (
                    <li key={i} style={{
                      padding: 'var(--space-sm) 0',
                      borderBottom: i < Math.min(comparison.sharedBills.length, 10) - 1 ? '1px solid var(--border-color)' : 'none',
                    }}>
                      <span className="text-sm" style={{ fontWeight: 600 }}>{bill.type} {bill.number}</span>
                      {' '}<span className="text-sm">{bill.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
