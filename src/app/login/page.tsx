'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const callbackError = useMemo(() => {
    return searchParams.get('error') === 'auth_callback_error'
      ? 'Erreur lors de la connexion avec Google. Veuillez réessayer.'
      : '';
  }, [searchParams]);
  const error = submitError || callbackError;

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push('/');
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsLoading(true);
    const result = await signIn(email, password);
    if (result.success) {
      router.push('/');
    } else {
      let errorMessage = result.error || 'Une erreur est survenue';
      if (errorMessage.includes('Invalid login credentials')) errorMessage = 'Email ou mot de passe incorrect';
      else if (errorMessage.includes('Email not confirmed')) errorMessage = 'Veuillez confirmer votre email avant de vous connecter';
      setSubmitError(errorMessage);
    }
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Panneau gauche — branding SONATE */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent-brand opacity-10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -left-32 w-72 h-72 rounded-full bg-accent-brand opacity-5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-brand flex items-center justify-center">
            <span className="text-primary font-bold text-lg">S</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Sonate</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.1]">
            Votre croissance<br />
            est clé.<br />
            <span className="text-accent-brand">Orchestrons-la.</span>
          </h1>
          <p className="mt-6 text-sm xl:text-base opacity-75 max-w-md leading-relaxed">
            Le dashboard d&apos;orchestration du groupe SONATE.
          </p>
        </div>

        <div className="relative z-10 text-xs opacity-60">
          © {new Date().getFullYear()} SONATE — Tous droits réservés
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo mobile uniquement */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-text-primary">Sonate</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-text-primary tracking-tight">Connexion</h2>
            <p className="text-sm text-text-secondary mt-2">
              Accède à Orchestra avec ton compte SONATE
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-danger-light border border-danger/20 rounded-lg text-danger">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-snug">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-premium w-full !py-3"
                placeholder="prenom.nom@sonate.group"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                  Mot de passe
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-premium w-full !py-3 pr-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-background px-3 text-text-tertiary">ou</span>
            </div>
          </div>

          <button
            type="button"
            disabled={googleLoading || isLoading}
            onClick={async () => {
              setSubmitError('');
              setGoogleLoading(true);
              const result = await signInWithGoogle();
              if (!result.success) {
                setSubmitError(result.error || 'Erreur lors de la connexion Google');
                setGoogleLoading(false);
              }
            }}
            className="w-full py-3 bg-surface hover:bg-surface-hover border border-border-default text-text-primary font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirection…
              </>
            ) : (
              <>
                <GoogleIcon className="w-4 h-4" />
                Continuer avec Google
              </>
            )}
          </button>

          <p className="mt-10 text-xs text-text-tertiary text-center">
            Authentification sécurisée via Supabase
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
