// Edge middleware — route protection
// Public routes are open, premium/admin routes require auth

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/api/user'];

// Routes that require premium tier
const PREMIUM_ROUTES = ['/compare', '/issues'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check in stub mode
  if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'stub') {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  // Check protected routes
  for (const route of PROTECTED_ROUTES) {
    if (pathname.startsWith(route)) {
      if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Check premium routes
  for (const route of PREMIUM_ROUTES) {
    if (pathname.startsWith(route)) {
      if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      const tier = (token as any).tier ?? 'free';
      if (tier === 'free') {
        return NextResponse.redirect(new URL('/upgrade', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/user/:path*', '/compare/:path*', '/issues/:path*'],
};
