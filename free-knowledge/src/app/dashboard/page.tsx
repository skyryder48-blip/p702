'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useCivicsAuth } from '@/core/auth/use-civics-auth';
import { FeatureGate, UpgradePrompt } from '@/core/auth/components';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  tier: string;
  zipCode: string | null;
  defaultState: string | null;
  createdAt: string;
}

interface SavedOfficial {
  id: string;
  bioguideId: string;
  name: string;
  title: string | null;
  party: string | null;
  state: string | null;
  chamber: string | null;
  alertsOn: boolean;
}

interface RepCard {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: string;
}

interface Alert {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  savedOfficial: { name: string; bioguideId: string; party: string } | null;
}

export default function DashboardPage() {
  const { tier } = useCivicsAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedOfficials, setSavedOfficials] = useState<SavedOfficial[]>([]);
  const [reps, setReps] = useState<RepCard[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editZip, setEditZip] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditName(data.name ?? '');
        setEditZip(data.zipCode ?? '');
      }
    } catch {}
  }, []);

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch('/api/user/saved');
      if (res.ok) {
        const data = await res.json();
        setSavedOfficials(data.officials);
      }
    } catch {}
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/user/alerts?limit=20');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
        setUnreadCount(data.unread);
      }
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([fetchProfile(), fetchSaved(), fetchAlerts()])
      .finally(() => setLoading(false));
  }, [fetchProfile, fetchSaved, fetchAlerts]);

  // Fetch reps when profile has zip code
  useEffect(() => {
    if (!profile?.zipCode) return;
    fetch(`/api/civics/zip?code=${profile.zipCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.representatives) setReps(data.representatives);
      })
      .catch(() => {});
  }, [profile?.zipCode]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, zipCode: editZip }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditingProfile(false);
      }
    } catch {}
    setProfileSaving(false);
  }

  async function handleToggleAlerts(bioguideId: string, currentState: boolean) {
    await fetch('/api/user/saved', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bioguideId, alertsOn: !currentState }),
    });
    setSavedOfficials(prev =>
      prev.map(o => o.bioguideId === bioguideId ? { ...o, alertsOn: !currentState } : o)
    );
  }

  async function handleRemoveSaved(bioguideId: string) {
    await fetch(`/api/user/saved?bioguideId=${bioguideId}`, { method: 'DELETE' });
    setSavedOfficials(prev => prev.filter(o => o.bioguideId !== bioguideId));
  }

  async function handleMarkAllRead() {
    const unreadIds = alerts.filter(a => !a.read).map(a => a.id);
    if (unreadIds.length === 0) return;
    await fetch('/api/user/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertIds: unreadIds, read: true }),
    });
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setUnreadCount(0);
  }

  const partyClass = (party: string | null) =>
    party?.toLowerCase().includes('democrat') ? 'democrat'
      : party?.toLowerCase().includes('republican') ? 'republican'
      : 'independent';

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="skeleton skeleton-heading" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ marginBottom: 'var(--space-xl)' }}>Dashboard</h1>

        {/* Section 1: Profile Summary */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <h2 style={{ marginBottom: 'var(--space-xs)' }}>{profile?.name ?? 'User'}</h2>
              <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-sm)' }}>{profile?.email}</p>
              <span style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: 20,
                fontSize: '0.8rem',
                fontWeight: 600,
                background: tier === 'free' ? 'var(--color-parchment-dark)' : 'var(--color-gold)',
                color: tier === 'free' ? 'var(--color-ink)' : 'white',
              }}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </span>
            </div>
            {!editingProfile && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
                onClick={() => setEditingProfile(true)}
              >
                Edit Profile
              </button>
            )}
          </div>

          {editingProfile && (
            <form onSubmit={handleProfileSave} style={{ marginTop: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'end' }}>
                <div>
                  <label htmlFor="editName" className="text-sm" style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>Name</label>
                  <input id="editName" type="text" className="input" value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} style={{ width: 200 }} />
                </div>
                <div>
                  <label htmlFor="editZip" className="text-sm" style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>Zip Code</label>
                  <input id="editZip" type="text" className="input" value={editZip} onChange={e => setEditZip(e.target.value)} pattern="\d{5}" maxLength={5} placeholder="e.g. 60188" style={{ width: 120 }} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProfile(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Section 2: My Representatives */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>My Representatives</h3>
          {!profile?.zipCode ? (
            <p className="text-muted">
              Set your zip code above to see your representatives.
            </p>
          ) : reps.length === 0 ? (
            <div className="skeleton skeleton-card" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
              {reps.map(rep => (
                <div key={rep.bioguideId} style={{
                  padding: 'var(--space-md)',
                  background: 'var(--color-parchment)',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border-color)',
                }}>
                  <Link href={`/official/${rep.bioguideId}`} style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                    {rep.name}
                  </Link>
                  <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                    {rep.chamber === 'senate' ? 'Senator' : 'Representative'} — {rep.state}
                    {rep.district ? ` District ${rep.district}` : ''}
                  </p>
                  <span className={`party-badge ${partyClass(rep.party)}`} style={{ marginTop: 'var(--space-sm)', display: 'inline-block' }}>
                    {rep.party}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Saved Officials */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Saved Officials</h3>
          {savedOfficials.length === 0 ? (
            <p className="text-muted">
              You haven&apos;t saved any officials yet. Browse{' '}
              <Link href="/">profiles</Link> to save the ones you want to track.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {savedOfficials.map(official => (
                <div key={official.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'var(--color-parchment)',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <Link href={`/official/${official.bioguideId}`} style={{ fontWeight: 600 }}>
                      {official.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {official.chamber === 'senate' ? 'Senator' : official.chamber === 'house' ? 'Representative' : ''}
                      {official.state ? ` — ${official.state}` : ''}
                    </p>
                    {official.party && (
                      <span className={`party-badge ${partyClass(official.party)}`} style={{ marginTop: 'var(--space-xs)', display: 'inline-block' }}>
                        {official.party}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '2px 10px' }}
                      onClick={() => handleToggleAlerts(official.bioguideId, official.alertsOn)}
                      title={official.alertsOn ? 'Disable alerts' : 'Enable alerts'}
                    >
                      Alerts: {official.alertsOn ? 'On' : 'Off'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '2px 10px', color: 'var(--color-nay)' }}
                      onClick={() => handleRemoveSaved(official.bioguideId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Alerts (premium gated) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h3>
              Alerts
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 'var(--space-sm)',
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'var(--color-mahogany)',
                  color: 'white',
                  fontFamily: 'var(--font-body)',
                }}>
                  {unreadCount}
                </span>
              )}
            </h3>
            {alerts.length > 0 && unreadCount > 0 && (
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '2px 10px' }} onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <FeatureGate feature="user.alerts">
            {alerts.length === 0 ? (
              <p className="text-muted">
                No alerts yet. Save officials and enable alerts to get notified about their activity.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {alerts.map(alert => (
                  <div key={alert.id} style={{
                    padding: 'var(--space-md)',
                    background: alert.read ? 'var(--color-parchment)' : 'white',
                    borderRadius: 'var(--border-radius)',
                    border: `1px solid ${alert.read ? 'var(--border-color)' : 'var(--color-gold)'}`,
                    borderLeft: alert.read ? undefined : '3px solid var(--color-gold)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: alert.read ? 400 : 600 }}>{alert.title}</span>
                      <span className="text-sm text-muted">{new Date(alert.createdAt).toLocaleDateString()}</span>
                    </div>
                    {alert.savedOfficial && (
                      <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                        <Link href={`/official/${alert.savedOfficial.bioguideId}`}>
                          {alert.savedOfficial.name}
                        </Link>
                      </p>
                    )}
                    <p className="text-sm" style={{ marginTop: 'var(--space-xs)', color: 'var(--color-ink-muted)' }}>
                      {alert.body.length > 150 ? alert.body.slice(0, 150) + '...' : alert.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </FeatureGate>
        </div>

        {/* Upgrade prompt for free users */}
        {tier === 'free' && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
            <Link href="/upgrade" className="btn btn-gold">Upgrade to Premium</Link>
          </div>
        )}
      </div>
    </div>
  );
}
