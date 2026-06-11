import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'app_session';
const SESSION_VALUE = 'authenticated';

export function isAuthenticated(request: NextRequest): boolean {
  const cookie = request.cookies.get(SESSION_COOKIE);
  return cookie?.value === SESSION_VALUE;
}

export function setAuthCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE);
}
