import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.has('auth_token');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isPublicPath =
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/favicon.ico';

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!isAuthenticated && !isLoginPage) {
    const from = request.nextUrl.pathname;
    const url = new URL('/login', request.url);
    url.searchParams.set('from', from);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isLoginPage) {
    const from = request.nextUrl.searchParams.get('from') || '/';
    return NextResponse.redirect(new URL(from, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
