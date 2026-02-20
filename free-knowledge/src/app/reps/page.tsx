'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Official {
  name: string;
  title: string;
  party: string;
  chamber: string;
  photoUrl?: string;
  bioguideId?: string;
  phones: string[];
  urls: string[];
  channels: { type: string; id: string }[];
}

interface ZipResult {
  zipCode: string;
  state: string;
  city?: string;
  officials: Official[];
}

export default function RepsPage() {
  const searchParams = useSearchParams();
  const zip = searchParams.get('zip');
  const [data, setData] = useState<ZipResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!zip) {
      setLoading(false);
      setError('No zip code provided.');
      return;
    }

    fetch(`/api/civics/zip?code=${zip}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch representatives');
        return res.json();
      })
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [zip]);

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="skeleton skeleton-heading" />
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="container">
          <h1>Error</h1>
          <p>{error}</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  if (!data || data.officials.length === 0) {
    return (
      <div className="page">
        <div className="container">
          <h1>No Representatives Found</h1>
          <p>No federal representatives were found for zip code {zip}.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
            Try Another Zip Code
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <h1>Your Representatives</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
          {data.city ? `${data.city}, ` : ''}{data.state} &mdash; {data.zipCode}
        </p>

        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
          {data.officials.map((official, i) => (
            <OfficialCard key={i} official={official} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OfficialCard({ official }: { official: Official }) {
  const partyClass = official.party.toLowerCase().includes('democrat')
    ? 'democrat'
    : official.party.toLowerCase().includes('republican')
    ? 'republican'
    : 'independent';

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
        {official.photoUrl && (
          <img
            src={official.photoUrl}
            alt={official.name}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--border-color)',
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: 'var(--space-xs)' }}>
            {official.bioguideId ? (
              <Link href={`/official/${official.bioguideId}`}>
                {official.name}
              </Link>
            ) : (
              official.name
            )}
          </h3>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-xs)' }}>
            {official.title}
          </p>
          <span className={`party-badge ${partyClass}`}>
            {official.party}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          {official.phones[0] && (
            <p className="text-sm">{official.phones[0]}</p>
          )}
          {official.bioguideId && (
            <Link
              href={`/official/${official.bioguideId}`}
              className="btn btn-secondary"
              style={{ marginTop: 'var(--space-sm)' }}
            >
              View Profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
