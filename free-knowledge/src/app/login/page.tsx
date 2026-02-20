'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    errorParam === 'CredentialsSignin' ? 'Invalid email or password.' : ''
  );
  const [loading, setLoading] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password.');
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 440, margin: '0 auto' }}>
        <div className="card" style={{ marginTop: 'var(--space-2xl)' }}>
          <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xs)', fontSize: '2rem' }}>
            Sign in
          </h1>
          <p className="text-center text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
            Welcome back to free-civics
          </p>

          {error && (
            <div style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--border-radius)',
              color: '#991b1b',
              marginBottom: 'var(--space-lg)',
              fontSize: '0.9rem',
            }}>
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => signIn('google', { callbackUrl })}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Continue with Google
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => signIn('github', { callbackUrl })}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Continue with GitHub
            </button>
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            margin: 'var(--space-lg) 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            <span className="text-sm text-muted">or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsSubmit}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label htmlFor="email" className="text-sm" style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label htmlFor="password" className="text-sm" style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm" style={{ marginTop: 'var(--space-lg)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ fontWeight: 600 }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
