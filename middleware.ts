// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isDev = process.env.NODE_ENV !== 'production';

export function middleware(request: NextRequest) {
  if (isDev) {
    return NextResponse.next(); // in dev non bloccare nulla
  }
  // ... tua logica attuale qui sotto se vuoi, altrimenti lascia così
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
