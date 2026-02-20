'use client';

import { AuthProvider } from '@/core/auth/components';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
