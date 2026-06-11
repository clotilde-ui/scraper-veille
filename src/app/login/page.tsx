'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/');
      } else {
        setError('Mot de passe incorrect');
      }
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

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
              Accède au Scraper SONATE
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
                  autoFocus
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
        </div>
      </div>
    </div>
  );
}
