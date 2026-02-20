'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useCivicsAuth } from '@/core/auth/use-civics-auth';

export function AuthNav() {
  const { isAuthenticated, isLoading, user, tier } = useCivicsAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        style={{
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: '0.95rem',
          fontWeight: 500,
          transition: 'color 0.2s',
        }}
      >
        Sign In
      </Link>
    );
  }

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'User';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
      <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>
        {displayName}
        {tier !== 'free' && (
          <span style={{
            marginLeft: 'var(--space-xs)',
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: '0.7rem',
            fontWeight: 700,
            background: 'var(--color-gold)',
            color: 'white',
          }}>
            {tier.toUpperCase()}
          </span>
        )}
      </span>
      <Link
        href="/dashboard"
        style={{
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: '0.85rem',
          fontWeight: 500,
        }}
      >
        Dashboard
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        style={{
          background: 'none',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: '0.8rem',
          fontWeight: 500,
          padding: '2px 10px',
          borderRadius: 'var(--border-radius)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
