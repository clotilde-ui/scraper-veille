'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, error: authError } = useSupabaseAuth();
  const [exchangeDone, setExchangeDone] = useState(false);
  const [exchangeError, setExchangeError] = useState(false);
  const exchangedRef = useRef(false);
  const redirectedRef = useRef(false);
  const [status, setStatus] = useState('Connexion en cours...');

  const next = searchParams.get('next') ?? '/';

  // Étape 1 : Vérifier session existante ou échanger le code OAuth
  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get('code');
    if (!code) {
      setExchangeError(true);
      return;
    }

    const supabase = getSupabaseClient();

    // Vérifier si une session existe déjà (auto-détection ou session cachée)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Session déjà établie — pas besoin d'échanger le code
        setExchangeDone(true);
        return;
      }

      // Pas de session — échanger le code manuellement
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('OAuth exchange error:', error.message);
          // Dernière chance : vérifier si la session a été établie entre-temps
          supabase.auth.getSession().then(({ data: { session: retrySession } }) => {
            if (retrySession) {
              setExchangeDone(true);
            } else {
              setExchangeError(true);
            }
          });
        } else {
          setExchangeDone(true);
        }
      });
    });
  }, [searchParams]);

  // Étape 2 : Attendre que le auth context confirme l'authentification + profil
  useEffect(() => {
    if (redirectedRef.current) return;

    // Erreur d'échange ou erreur auth context (domaine bloqué, provision échouée)
    if (exchangeError || authError) {
      redirectedRef.current = true;
      router.replace('/login?error=auth_callback_error');
      return;
    }

    // Échange OK + authentifié + profil chargé → rediriger
    if (exchangeDone && isAuthenticated && user) {
      redirectedRef.current = true;
      setStatus('Redirection...');
      // Full page reload pour que le middleware ait les cookies frais
      window.location.href = next;
      return;
    }

    // Échange OK + authentifié mais profil en cours (auto-provision)
    if (exchangeDone && isAuthenticated && !user) {
      setStatus('Chargement du profil...');
    }
  }, [exchangeDone, exchangeError, isAuthenticated, user, authError, router, next]);

  // Timeout de sécurité — si rien ne se passe après 15s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        console.error('OAuth callback timeout');
        router.replace('/login?error=auth_callback_error');
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">{status}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Connexion en cours...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
