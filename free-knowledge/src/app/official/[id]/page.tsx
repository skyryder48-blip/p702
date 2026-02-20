'use client';

import { useEffect, useState } from 'react';
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

type Tab = 'overview' | 'legislation' | 'finance';

export default function OfficialPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

        // Fetch finance data in background
        fetch(`/api/civics/member/${id}/finance?name=${encodeURIComponent(data.member.name)}`)
          .then(res => res.json())
          .then(fin => setFinance(fin))
          .catch(() => {});
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

  const { member, bills, biography } = profile;
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

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'legislation' ? 'active' : ''}`}
            onClick={() => setActiveTab('legislation')}
          >
            Legislation
          </button>
          <button
            className={`tab ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveTab('finance')}
          >
            Campaign Finance
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab member={member} biography={biography} />
        )}
        {activeTab === 'legislation' && (
          <LegislationTab bills={bills} />
        )}
        {activeTab === 'finance' && (
          <FinanceTab finance={finance} memberName={member.name} />
        )}
      </div>
    </div>
  );
}

// --- Overview Tab ---

function OverviewTab({ member, biography }: { member: Member; biography?: Biography | null }) {
  return (
    <div>
      {biography && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Biography</h3>
          <p>{biography.summary}</p>
          <a href={biography.pageUrl} target="_blank" rel="noopener noreferrer" className="text-sm">
            Read more on Wikipedia
          </a>
        </div>
      )}

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
              {finance.topContributors.map((c, i) => (
                <tr key={i}>
                  <td>{c.name}</td>
                  <td className="text-sm">{c.employer ?? '—'}</td>
                  <td>{formatCurrency(c.amount)}</td>
                  <td className="text-sm">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
