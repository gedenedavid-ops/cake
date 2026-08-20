// proxy.ts — remplace middleware.ts pour Next.js 16+
// Protège toutes les routes sauf /auth/* et les assets statiques
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/';

  const isAuthenticated = !!req.auth;

  if (!isPublic && !isAuthenticated) {
    const loginUrl = new URL('/auth/connexion', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons).*)'],
};
