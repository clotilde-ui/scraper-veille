'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { LogOut } from 'lucide-react';

const PUBLIC_ROUTES = ['/login', '/auth/callback'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, isAuthenticated, isLoading } = useSupabaseAuth();

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (isPublic) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border-default bg-surface sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary tracking-tight leading-none">Scraper</h1>
              <p className="text-[10px] text-text-tertiary leading-none mt-0.5">SONATE</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-text-secondary hidden sm:inline">{user.email}</span>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-hover transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
