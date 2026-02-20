'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // Auto-sign in after successful registration
      const result = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        // Registration succeeded but auto-login failed — redirect to login
        router.push('/login');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 440, margin: '0 auto' }}>
        <div className="card" style={{ marginTop: 'var(--space-2xl)' }}>
          <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xs)', fontSize: '2rem' }}>
            Create your account
          </h1>
          <p className="text-center text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
            Join free-civics to track your representatives
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

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label htmlFor="name" className="text-sm" style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>
                Name <span className="text-muted">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
              />
            </div>

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

            <div style={{ marginBottom: 'var(--space-md)' }}>
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
                minLength={12}
                autoComplete="new-password"
              />
              <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                At least 12 characters
              </p>
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label htmlFor="confirmPassword" className="text-sm" style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm" style={{ marginTop: 'var(--space-lg)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
