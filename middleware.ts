import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Redirect unauthenticated users to /login for protected pages
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow special and public paths
  const publicPrefixes = [
    '/login',
    '/register',
    '/forgot-password',
    '/otp-verification',
    '/manifest.webmanifest',
    '/offline.html',
    '/sw.js',
    '/favicon.ico',
    '/test-face-recognition',
  ];

  const isPublic = (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/models') ||
    pathname.startsWith('/api') ||
    publicPrefixes.some(p => pathname === p || pathname.startsWith(p + '/'))
  );

  if (isPublic) return NextResponse.next();

  // Check for auth cookie presence
  const token = req.cookies.get('unilink_token')?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    // Redirect root path and all other unauthenticated requests to login
    if (pathname !== '/login') {
      url.pathname = '/login';
      if (pathname !== '/') {
        url.searchParams.set('from', pathname);
      }
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
