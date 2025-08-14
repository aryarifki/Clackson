import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/api/keys'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (pathname === '/' ) return NextResponse.next();
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const hasSession = req.cookies.get('session');
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|favicon.ico|api/auth).*)'] };
