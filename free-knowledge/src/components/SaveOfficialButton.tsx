'use client';

import { useEffect, useState } from 'react';
import { useCivicsAuth } from '@/core/auth/use-civics-auth';

interface SaveOfficialButtonProps {
  bioguideId: string;
  name: string;
  title?: string;
  party?: string;
  state?: string;
  chamber?: string;
}

export function SaveOfficialButton({ bioguideId, name, title, party, state, chamber }: SaveOfficialButtonProps) {
  const { isAuthenticated, isLoading: authLoading } = useCivicsAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }

    fetch('/api/user/saved')
      .then(res => res.json())
      .then(data => {
        const match = data.officials?.some((o: { bioguideId: string }) => o.bioguideId === bioguideId);
        setSaved(!!match);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bioguideId, isAuthenticated, authLoading]);

  async function handleToggle() {
    if (acting) return;
    setActing(true);

    // Optimistic update
    const wasSaved = saved;
    setSaved(!wasSaved);

    try {
      if (wasSaved) {
        const res = await fetch(`/api/user/saved?bioguideId=${bioguideId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch('/api/user/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bioguideId, name, title, party, state, chamber }),
        });
        if (!res.ok) throw new Error();
      }
    } catch {
      // Revert on error
      setSaved(wasSaved);
    }

    setActing(false);
  }

  if (authLoading || loading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <a
        href={`/login?callbackUrl=/official/${bioguideId}`}
        className="btn btn-secondary"
        style={{ fontSize: '0.85rem' }}
      >
        Sign in to save
      </a>
    );
  }

  return (
    <button
      className={saved ? 'btn btn-gold' : 'btn btn-secondary'}
      onClick={handleToggle}
      disabled={acting}
      style={{ fontSize: '0.85rem' }}
    >
      {saved ? 'Saved' : 'Save Official'}
    </button>
  );
}
