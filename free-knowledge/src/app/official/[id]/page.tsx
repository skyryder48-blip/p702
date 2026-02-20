'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Types
interface Member {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'house' | 'senate';
  birthYear?: string;
  depiction?: string;
  officialUrl?: string;
  currentMember: boolean;
  terms: { chamber: string; congress: number; startYear: number }[];
  sponsoredCount: number;
  cosponsoredCount: number;
}

interface Bill {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  latestAction: string;
  policyArea?: string;
  url: string;
}

interface Biography {
  title: string;
  summary: string;
  pageUrl: string;
}

interface ProfileData {
  member: Member;
  bills: Bill[];
  biography?: Biography | null;
  wikidataFacts?: any;
}

interface FinanceData {
  bioguideId: string;
  found: boolean;
  candidate?: {
    candidateId: string;
    name: string;
    party: string;
    cycle: number;
    totalReceipts: number;
    totalDisbursements: number;
    cashOnHand: number;
    individualContributions: number;
    pacContributions: number;
    fecUrl: string;
  };
  topContributors?: { name: string; employer?: string; amount: number; date: string }[];
}

interface VoteRecord {
  date: string;
  question: string;
  result: string;
  memberPosition: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  partyBreakdown: {
    democratic: { yea: number; nay: number; notVoting: number };
    republican: { yea: number; nay: number; notVoting: number };
  };
  billNumber?: string;
  url?: string;
}

interface CommitteeAssignment {
  name: string;
  code: string;
  role: string;
  chamber: string;
  url: string;
  subcommittees?: { name: string; role: string }[];
}

interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface MetricDimension {
  id: string;
  label: string;
  description: string;
  value: number;
  benchmark: number;
  unit: string;
  context: string;
}

interface Scorecard {
  bioguideId: string;
  name: string;
  chamber: string;
  dimensions: MetricDimension[];
  generatedAt: string;
}

type Tab = 'overview' | 'legislation' | 'votes' | 'finance' | 'metrics';
const TABS: Tab[] = ['overview', 'legislation', 'votes', 'finance', 'metrics'];
const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  legislation: 'Legislation',
  votes: 'Votes',
  finance: 'Campaign Finance',
  metrics: 'Metrics',
};

export default function OfficialPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [votes, setVotes] = useState<VoteRecord[] | null>(null);
  const [committees, setCommittees] = useState<CommitteeAssignment[] | null>(null);
  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Keyboard navigation for tabs (arrow keys)
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = TABS.indexOf(activeTab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = TABS[(idx + 1) % TABS.length];
      setActiveTab(next);
      document.getElementById(`tab-${next}`)?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = TABS[(idx - 1 + TABS.length) % TABS.length];
      setActiveTab(prev);
      document.getElementById(`tab-${prev}`)?.focus();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/civics/member/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch member data');
        return res.json();
      })
      .then(data => {
        setProfile(data);
        setLoading(false);

        const member = data.member;
        const name = encodeURIComponent(member.name);
        const chamber = member.chamber;

        // Fetch supplementary data in background
        fetch(`/api/civics/member/${id}/finance?name=${name}`)
          .then(res => res.json()).then(setFinance).catch(() => {});

        fetch(`/api/civics/member/${id}/votes?chamber=${chamber}`)
          .then(res => res.json()).then(d => setVotes(d.votes ?? [])).catch(() => {});

        fetch(`/api/civics/member/${id}/committees`)
          .then(res => res.json()).then(d => setCommittees(d.committees ?? [])).catch(() => {});

        fetch(`/api/civics/member/${id}/news?name=${name}`)
          .then(res => res.json()).then(d => setNews(d.articles ?? [])).catch(() => {});

        fetch(`/api/civics/member/${id}/metrics?chamber=${chamber}`)
          .then(res => res.json()).then(setScorecard).catch(() => {});
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="skeleton skeleton-heading" />
          <div className="skeleton" style={{ height: 200, marginBottom: 'var(--space-lg)' }} />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page">
        <div className="container">
          <h1>Error</h1>
          <p>{error || 'Profile not found'}</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const { member, bills, biography, wikidataFacts } = profile;
  const partyClass = member.party.toLowerCase().includes('democrat')
    ? 'democrat'
    : member.party.toLowerCase().includes('republican')
    ? 'republican'
    : 'independent';

  return (
    <div className="page">
      <div className="container">
        {/* Hero Card */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'center', flexWrap: 'wrap' }}>
            {member.depiction && (
              <img
                src={member.depiction}
                alt={member.name}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid var(--border-color)',
                }}
              />
            )}
            <div>
              <h1 style={{ marginBottom: 'var(--space-xs)' }}>{member.name}</h1>
              <p style={{ fontSize: '1.1rem', color: 'var(--color-ink-muted)', marginBottom: 'var(--space-sm)' }}>
                {member.chamber === 'senate' ? 'U.S. Senator' : 'U.S. Representative'}
                {member.district ? ` — ${member.state} District ${member.district}` : ` — ${member.state}`}
              </p>
              <span className={`party-badge ${partyClass}`}>{member.party}</span>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-mahogany)' }}>
                    {member.sponsoredCount}
                  </p>
                  <p className="text-sm text-muted">Bills Sponsored</p>
                </div>
                <div>
                  <p style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-mahogany)' }}>
                    {member.cosponsoredCount}
                  </p>
                  <p className="text-sm text-muted">Bills Cosponsored</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs — accessible with ARIA and keyboard navigation */}
        <div className="tabs" role="tablist" aria-label="Profile sections" onKeyDown={handleTabKeyDown}>
          {TABS.map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              id={`tab-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'overview' && (
            <OverviewTab
              member={member}
              biography={biography}
              wikidataFacts={wikidataFacts}
              committees={committees}
              news={news}
            />
          )}
          {activeTab === 'legislation' && (
            <LegislationTab bills={bills} />
          )}
          {activeTab === 'votes' && (
            <VotesTab votes={votes} />
          )}
          {activeTab === 'finance' && (
            <FinanceTab finance={finance} memberName={member.name} />
          )}
          {activeTab === 'metrics' && (
            <MetricsTab scorecard={scorecard} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Overview Tab ---

function OverviewTab({
  member,
  biography,
  wikidataFacts,
  committees,
  news,
}: {
  member: Member;
  biography?: Biography | null;
  wikidataFacts?: any;
  committees: CommitteeAssignment[] | null;
  news: NewsArticle[] | null;
}) {
  return (
    <div>
      {/* Biography */}
      {biography && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Biography</h3>
          <p style={{ lineHeight: 1.7, marginBottom: 'var(--space-md)' }}>{biography.summary}</p>

          {/* Wikidata structured facts */}
          {wikidataFacts && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-md)',
              padding: 'var(--space-md)',
              background: 'var(--color-parchment-dark, #f5f0e8)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-md)',
            }}>
              {wikidataFacts.birthDate && (
                <div>
                  <p className="text-sm text-muted">Born</p>
                  <p className="text-sm">{wikidataFacts.birthDate}{wikidataFacts.birthPlace ? `, ${wikidataFacts.birthPlace}` : ''}</p>
                </div>
              )}
              {wikidataFacts.education && wikidataFacts.education.length > 0 && (
                <div>
                  <p className="text-sm text-muted">Education</p>
                  <p className="text-sm">{wikidataFacts.education.join(', ')}</p>
                </div>
              )}
              {wikidataFacts.spouse && (
                <div>
                  <p className="text-sm text-muted">Spouse</p>
                  <p className="text-sm">{wikidataFacts.spouse}</p>
                </div>
              )}
              {wikidataFacts.occupation && wikidataFacts.occupation.length > 0 && (
                <div>
                  <p className="text-sm text-muted">Occupation</p>
                  <p className="text-sm">{wikidataFacts.occupation.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          <a href={biography.pageUrl} target="_blank" rel="noopener noreferrer" className="text-sm">
            Read more on Wikipedia
          </a>
        </div>
      )}

      {/* Committee Assignments */}
      {committees && committees.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Committee Assignments</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {committees.map((c, i) => (
              <div key={i} style={{
                padding: 'var(--space-md)',
                background: 'var(--color-parchment-dark, #f5f0e8)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: c.role !== 'Member' ? '3px solid var(--color-gold)' : '3px solid var(--border-color)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                    {c.name}
                  </a>
                  {c.role !== 'Member' && (
                    <span className="text-sm" style={{
                      color: 'var(--color-gold-dark, #8B7000)',
                      fontWeight: 600,
                    }}>
                      {c.role}
                    </span>
                  )}
                </div>
                {c.subcommittees && c.subcommittees.length > 0 && (
                  <div style={{ marginTop: 'var(--space-xs)' }}>
                    {c.subcommittees.map((sc, j) => (
                      <p key={j} className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                        {sc.name}{sc.role !== 'Member' ? ` (${sc.role})` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent News */}
      {news && news.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Recent News</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {news.slice(0, 5).map((article, i) => (
              <div key={i} style={{
                paddingBottom: i < Math.min(news.length, 5) - 1 ? 'var(--space-md)' : 0,
                borderBottom: i < Math.min(news.length, 5) - 1 ? '1px solid var(--border-color)' : 'none',
              }}>
                <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, lineHeight: 1.3 }}>
                  {article.title}
                </a>
                <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                  {article.source} — {new Date(article.publishedAt).toLocaleDateString()}
                </p>
                {article.description && (
                  <p className="text-sm" style={{ marginTop: 'var(--space-xs)', color: 'var(--color-ink-muted)' }}>
                    {article.description.length > 150
                      ? article.description.slice(0, 150) + '...'
                      : article.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service History */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ marginBottom: 'var(--space-md)' }}>Service History</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Congress</th>
              <th>Chamber</th>
              <th>Start Year</th>
            </tr>
          </thead>
          <tbody>
            {member.terms.slice().reverse().map((term, i) => (
              <tr key={i}>
                <td>{term.congress}th</td>
                <td>{term.chamber}</td>
                <td>{term.startYear}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {member.officialUrl && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Links</h3>
          <a href={member.officialUrl} target="_blank" rel="noopener noreferrer">
            Official Website
          </a>
        </div>
      )}
    </div>
  );
}

// --- Legislation Tab ---

function LegislationTab({ bills }: { bills: Bill[] }) {
  if (bills.length === 0) {
    return (
      <div className="card">
        <p className="text-muted">No sponsored legislation found.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 'var(--space-lg)' }}>Sponsored Legislation</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Bill</th>
            <th>Title</th>
            <th>Introduced</th>
            <th>Policy Area</th>
            <th>Latest Action</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill, i) => (
            <tr key={i}>
              <td>
                <a href={bill.url} target="_blank" rel="noopener noreferrer">
                  {bill.type} {bill.number}
                </a>
              </td>
              <td>{bill.title}</td>
              <td className="text-sm">{bill.introducedDate}</td>
              <td className="text-sm">{bill.policyArea ?? '—'}</td>
              <td className="text-sm text-muted">{bill.latestAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Votes Tab ---

function VotesTab({ votes }: { votes: VoteRecord[] | null }) {
  if (votes === null) {
    return (
      <div className="card">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div className="card">
        <p className="text-muted">No voting records found.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 'var(--space-lg)' }}>Recent Roll Call Votes</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Bill</th>
            <th>Question</th>
            <th>Vote</th>
            <th>Result</th>
            <th>Party Split (D/R)</th>
          </tr>
        </thead>
        <tbody>
          {votes.map((vote, i) => {
            const posClass = vote.memberPosition === 'Yea' ? 'vote-yea'
              : vote.memberPosition === 'Nay' ? 'vote-nay'
              : 'vote-other';
            const dem = vote.partyBreakdown.democratic;
            const rep = vote.partyBreakdown.republican;
            return (
              <tr key={i}>
                <td className="text-sm">{vote.date}</td>
                <td className="text-sm">
                  {vote.billNumber ?? '—'}
                </td>
                <td>{vote.question.length > 80 ? vote.question.slice(0, 80) + '...' : vote.question}</td>
                <td>
                  <span className={posClass}>{vote.memberPosition}</span>
                </td>
                <td className="text-sm">{vote.result}</td>
                <td className="text-sm text-muted">
                  D: {dem.yea}-{dem.nay} / R: {rep.yea}-{rep.nay}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- Finance Tab ---

function FinanceTab({ finance, memberName }: { finance: FinanceData | null; memberName: string }) {
  if (!finance || !finance.found) {
    return (
      <div className="card">
        <p className="text-muted">No campaign finance data found for {memberName}.</p>
      </div>
    );
  }

  const c = finance.candidate!;
  const formatCurrency = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div>
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ marginBottom: 'var(--space-lg)' }}>
          {c.cycle} Campaign Finance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-lg)' }}>
          <div>
            <p className="text-sm text-muted">Total Receipts</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-mahogany)' }}>
              {formatCurrency(c.totalReceipts)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Total Disbursements</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {formatCurrency(c.totalDisbursements)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Cash on Hand</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {formatCurrency(c.cashOnHand)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Individual Contributions</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {formatCurrency(c.individualContributions)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">PAC Contributions</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {formatCurrency(c.pacContributions)}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 'var(--space-lg)' }}>
          Source: <a href={c.fecUrl} target="_blank" rel="noopener noreferrer">Federal Election Commission</a>
        </p>
      </div>

      {finance.topContributors && finance.topContributors.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Top Individual Contributors</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employer</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {finance.topContributors.map((contrib, i) => (
                <tr key={i}>
                  <td>{contrib.name}</td>
                  <td className="text-sm">{contrib.employer ?? '—'}</td>
                  <td>{formatCurrency(contrib.amount)}</td>
                  <td className="text-sm">{contrib.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Metrics Tab ---

function MetricsTab({ scorecard }: { scorecard: Scorecard | null }) {
  if (!scorecard) {
    return (
      <div className="card">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  if (!scorecard.dimensions || scorecard.dimensions.length === 0) {
    return (
      <div className="card">
        <p className="text-muted">Metrics data not yet available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ marginBottom: 'var(--space-xs)' }}>Performance Metrics</h3>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
          Raw data with {scorecard.chamber} chamber averages as benchmarks. No grades, no judgments — just data and context.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {scorecard.dimensions.map(dim => {
            const maxVal = Math.max(dim.value, dim.benchmark) * 1.2 || 1;
            const valuePct = Math.min((dim.value / maxVal) * 100, 100);
            const benchPct = Math.min((dim.benchmark / maxVal) * 100, 100);

            return (
              <div key={dim.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                  <span style={{ fontWeight: 600 }}>{dim.label}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-mahogany)' }}>
                    {dim.value}{dim.unit === '%' ? '%' : ` ${dim.unit}`}
                  </span>
                </div>
                <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-sm)' }}>
                  {dim.description}
                </p>
                <div className="metric-bar-container" style={{
                  position: 'relative',
                  height: 24,
                  background: 'var(--color-parchment-dark, #f0ebe0)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                }}>
                  {/* Member value bar */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${valuePct}%`,
                    background: 'var(--color-mahogany)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'width 0.5s ease',
                    opacity: 0.8,
                  }} />
                  {/* Benchmark marker */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: `${benchPct}%`,
                    width: 2,
                    height: '100%',
                    background: 'var(--color-gold, #D4A843)',
                    zIndex: 1,
                  }} />
                </div>
                <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                  {dim.context}
                </p>
              </div>
            );
          })}
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--space-lg)',
          marginTop: 'var(--space-xl)',
          padding: 'var(--space-md)',
          background: 'var(--color-parchment-dark, #f5f0e8)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <div style={{ width: 16, height: 16, background: 'var(--color-mahogany)', borderRadius: 2, opacity: 0.8 }} />
            <span className="text-sm">Member value</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <div style={{ width: 2, height: 16, background: 'var(--color-gold, #D4A843)' }} />
            <span className="text-sm">Chamber average</span>
          </div>
        </div>
      </div>
    </div>
  );
}
