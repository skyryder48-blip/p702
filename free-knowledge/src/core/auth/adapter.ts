// Provider-agnostic auth adapter
// StubAuthAdapter for development, NextAuthAdapter for production

import type { Tier } from './tiers';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  tier: Tier;
  image?: string;
}

export interface AuthAdapter {
  getUser(): AuthUser | null;
  isAuthenticated(): boolean;
  getTier(): Tier;
}

// Stub adapter for development — reads tier from environment
export class StubAuthAdapter implements AuthAdapter {
  private user: AuthUser | null;

  constructor() {
    const forceTier = (typeof window !== 'undefined'
      ? (window as any).__NEXT_DATA__?.props?.pageProps?.forceTier
      : process.env.NEXT_PUBLIC_FORCE_TIER) as Tier | undefined;

    if (forceTier) {
      this.user = {
        id: 'stub-user',
        email: 'dev@freecivics.org',
        name: 'Dev User',
        tier: forceTier,
      };
    } else {
      this.user = null;
    }
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  getTier(): Tier {
    return this.user?.tier ?? 'free';
  }
}

// NextAuth adapter for production — wraps NextAuth session
export class NextAuthAdapter implements AuthAdapter {
  private session: any;

  constructor(session: any) {
    this.session = session;
  }

  getUser(): AuthUser | null {
    if (!this.session?.user) return null;
    return {
      id: this.session.user.id,
      email: this.session.user.email,
      name: this.session.user.name,
      tier: this.session.user.tier ?? 'free',
      image: this.session.user.image,
    };
  }

  isAuthenticated(): boolean {
    return !!this.session?.user;
  }

  getTier(): Tier {
    return this.session?.user?.tier ?? 'free';
  }
}

// Factory
export function createAuthAdapter(session?: any): AuthAdapter {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'stub';
  if (provider === 'stub') return new StubAuthAdapter();
  return new NextAuthAdapter(session);
}
