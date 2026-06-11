import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login'];
const SESSION_COOKIE = 'app_session';
const SESSION_VALUE = 'authenticated';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const cookie = request.cookies.get(SESSION_COOKIE);
  const authenticated = cookie?.value === SESSION_VALUE;

  if (!authenticated && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && pathname.startsWith('/login')) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
