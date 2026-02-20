'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Issue categories matching ISSUE_CATEGORIES from config/profiles.ts
const ISSUE_CATEGORIES = [
  { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { id: 'economy', label: 'Economy & Jobs', icon: '💼' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'environment', label: 'Environment & Energy', icon: '🌍' },
  { id: 'defense', label: 'Defense & Veterans', icon: '🛡️' },
  { id: 'immigration', label: 'Immigration', icon: '🗽' },
  { id: 'civil-rights', label: 'Civil Rights', icon: '⚖️' },
  { id: 'taxation', label: 'Taxation & Budget', icon: '📋' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
  { id: 'technology', label: 'Technology & Privacy', icon: '💻' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { id: 'foreign-policy', label: 'Foreign Policy', icon: '🌐' },
];

interface IssueReport {
  issueId: string;
  label: string;
  officialName: string;
  relatedBills: { title: string; type: string; number: number; policyArea?: string }[];
  relatedVotes: { date: string; question: string; memberPosition: string }[];
  summary: {
    totalBills: number;
    totalVotes: number;
    yeaVotes: number;
    nayVotes: number;
  };
}

export default function IssuesPage() {
  const searchParams = useSearchParams();
  const officialId = searchParams.get('official') ?? '';
  const selectedIssue = searchParams.get('issue') ?? '';
  const [report, setReport] = useState<IssueReport | null>(null);
  const [officialName, setOfficialName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputId, setInputId] = useState(officialId);

  useEffect(() => {
    if (!officialId || !selectedIssue) return;

    setLoading(true);
    setError('');

    fetch(`/api/civics/issues?official=${officialId}&issue=${selectedIssue}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch issue report');
        return res.json();
      })
      .then(data => {
        setReport(data);
        setOfficialName(data.officialName ?? '');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [officialId, selectedIssue]);

  // If we have an official but no issue selected, fetch the name
  useEffect(() => {
    if (!officialId || selectedIssue) return;

    fetch(`/api/civics/member/${officialId}`)
      .then(res => res.json())
      .then(data => setOfficialName(data.member?.name ?? ''))
      .catch(() => {});
  }, [officialId, selectedIssue]);

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ marginBottom: 'var(--space-lg)' }}>Issue Reports</h1>

        {/* Official selection */}
        {!officialId ? (
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
              Enter a bioguide ID to see how an official&apos;s record relates to specific issues.
            </p>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (inputId) window.location.href = `/issues?official=${inputId}`;
              }}
              style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'end' }}
            >
              <div>
                <label htmlFor="officialId" className="text-sm" style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>
                  Bioguide ID
                </label>
                <input
                  id="officialId"
                  type="text"
                  className="input"
                  placeholder="e.g. P000197"
                  value={inputId}
                  onChange={e => setInputId(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">View Issues</button>
            </form>
          </div>
        ) : null}

        {/* Issue category grid */}
        {officialId && !selectedIssue && (
          <div>
            {officialName && (
              <p style={{ marginBottom: 'var(--space-lg)' }}>
                Select an issue to see how <Link href={`/official/${officialId}`}><strong>{officialName}</strong></Link>&apos;s record relates to it.
              </p>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 'var(--space-md)',
            }}>
              {ISSUE_CATEGORIES.map(cat => (
                <Link
                  key={cat.id}
                  href={`/issues?official=${officialId}&issue=${cat.id}`}
                  className="card"
                  style={{
                    textDecoration: 'none',
                    textAlign: 'center',
                    padding: 'var(--space-lg)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: 'var(--space-sm)' }}>{cat.icon}</span>
                  <span style={{ fontWeight: 600 }}>{cat.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div>
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card">
            <p style={{ color: 'var(--color-error, #c00)' }}>{error}</p>
          </div>
        )}

        {/* Issue Report */}
        {report && (
          <div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <Link href={`/issues?official=${officialId}`} className="text-sm">
                &larr; Back to all issues
              </Link>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ marginBottom: 'var(--space-xs)' }}>{report.label}</h2>
              <p className="text-muted">
                {report.officialName}&apos;s record on {report.label.toLowerCase()}
              </p>
            </div>

            {/* Summary Stats */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 'var(--space-lg)',
                textAlign: 'center',
              }}>
                <div>
                  <p style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-mahogany)' }}>
                    {report.summary.totalBills}
                  </p>
                  <p className="text-sm text-muted">Related Bills</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-mahogany)' }}>
                    {report.summary.totalVotes}
                  </p>
                  <p className="text-sm text-muted">Related Votes</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-success, #2e7d32)' }}>
                    {report.summary.yeaVotes}
                  </p>
                  <p className="text-sm text-muted">Yea Votes</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-error, #c62828)' }}>
                    {report.summary.nayVotes}
                  </p>
                  <p className="text-sm text-muted">Nay Votes</p>
                </div>
              </div>
            </div>

            {/* Related Bills */}
            {report.relatedBills.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Related Sponsored Bills</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bill</th>
                      <th>Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.relatedBills.map((bill, i) => (
                      <tr key={i}>
                        <td className="text-sm">{bill.type} {bill.number}</td>
                        <td>{bill.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Related Votes */}
            {report.relatedVotes.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Related Votes</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Question</th>
                      <th>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.relatedVotes.map((vote, i) => {
                      const posClass = vote.memberPosition === 'Yea' ? 'vote-yea'
                        : vote.memberPosition === 'Nay' ? 'vote-nay'
                        : 'vote-other';
                      return (
                        <tr key={i}>
                          <td className="text-sm">{vote.date}</td>
                          <td>{vote.question}</td>
                          <td><span className={posClass}>{vote.memberPosition}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {report.summary.totalBills === 0 && report.summary.totalVotes === 0 && (
              <div className="card">
                <p className="text-muted">
                  No legislative activity found for {report.officialName} in the {report.label.toLowerCase()} area.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
