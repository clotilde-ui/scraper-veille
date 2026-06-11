// Supabase middleware stub — replaced by simple cookie auth in /middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
