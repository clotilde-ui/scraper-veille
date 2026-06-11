'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { DbUserWithRole } from '@/types/supabase';

// IDs des rôles
const SUPER_ADMIN_ROLE_ID = 'a0000000-0000-0000-0000-000000000000';
const SUPER_ADMIN_EMAIL = 'emmanuel.d@lets-clic.com';

// Domaines autorisés pour Google SSO
const ALLOWED_DOMAINS = ['lets-clic.com', 'wedig.fr', 'deux.io'];

// Timeouts
const PROFILE_LOAD_TIMEOUT = 5000; // 5 secondes max pour charger le profil
const MAX_INIT_TIMEOUT = 8000; // 8 secondes max pour l'initialisation complète

// Helper pour créer un timeout promise (fonctionne avec Promise ou PromiseLike)
const withTimeout = <T,>(promiseLike: PromiseLike<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([Promise.resolve(promiseLike), timeout]);
};

interface AuthContextType {
  // Utilisateur Supabase Auth
  authUser: SupabaseUser | null;
  // Profil utilisateur depuis la table users
  user: DbUserWithRole | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isPrimarySuperAdmin: boolean;
  error: string | null;
  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<DbUserWithRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const supabase = getSupabaseClient();

  // Charger le profil utilisateur avec timeout
  const loadUserProfile = async (authId: string, retries = 2): Promise<DbUserWithRole | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await withTimeout(
          supabase
            .from('users')
            .select(`
              *,
              roles (*)
            `)
            .eq('auth_id', authId)
            .limit(1),
          PROFILE_LOAD_TIMEOUT
        ) as { data: DbUserWithRole[] | null; error: { message: string } | null };

        if (result.error) {
          console.warn(`Tentative ${attempt}/${retries} - Erreur chargement profil:`, result.error.message);
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          return null;
        }

        return result.data?.[0] ?? null;
      } catch (err) {
        console.warn(`Tentative ${attempt}/${retries} - Erreur:`, err);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        return null;
      }
    }
    return null;
  };

  // Auto-provisionner un profil pour les utilisateurs OAuth
  const autoProvision = async (authUser: SupabaseUser): Promise<DbUserWithRole | null> => {
    try {
      const response = await fetch('/api/auth/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: authUser.id,
          email: authUser.email,
          fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
          avatarUrl: authUser.user_metadata?.avatar_url || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Si le profil existe déjà, recharger
        if (result.alreadyExists) {
          return await loadUserProfile(authUser.id);
        }
        console.error('Erreur auto-provision:', result.error);
        return null;
      }

      return result.user as DbUserWithRole;
    } catch (err) {
      console.error('Erreur auto-provision:', err);
      return null;
    }
  };

  // Rafraîchir le profil utilisateur
  const refreshProfile = async () => {
    if (!authUser) return;

    try {
      const profile = await loadUserProfile(authUser.id);
      if (mountedRef.current && profile) {
        setUser(profile);
        setError(null);
      }
    } catch (err) {
      console.error('Erreur refresh profile:', err);
    }
  };

  // Fonction retry pour réessayer l'initialisation
  const retry = () => {
    setIsLoading(true);
    setError(null);
    initAuth();
  };

  // Initialiser l'authentification
  const initAuth = async () => {
    // Timeout de sécurité - force la fin du chargement après MAX_INIT_TIMEOUT
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }
    initTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('Timeout initialisation auth - forçage fin du chargement');
        setIsLoading(false);
      }
    }, MAX_INIT_TIMEOUT);

    try {
      // Récupérer la session actuelle avec timeout
      const sessionResult = await withTimeout(
        supabase.auth.getSession(),
        5000
      ) as { data: { session: Session | null }; error: { message: string } | null };

      if (!mountedRef.current) return;

      const currentSession = sessionResult.data?.session;
      if (currentSession?.user) {
        setSession(currentSession);
        setAuthUser(currentSession.user);

        // Ne PAS charger le profil ici — onAuthStateChange le fait
        // avec la logique complète (auto-provision, vérification domaine, etc.)
        // Évite la race condition entre initAuth et onAuthStateChange
      }

      setError(null);
    } catch (err) {
      console.error('Erreur initialisation auth:', err);
      if (mountedRef.current) {
        setError('Erreur de connexion au serveur');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    }
  };

  // Initialiser l'authentification au montage
  useEffect(() => {
    mountedRef.current = true;

    initAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mountedRef.current) return;

        console.log('Auth event:', event);

        setSession(newSession);
        setAuthUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Charger le profil en arrière-plan
          loadUserProfile(newSession.user.id).then(async (profile) => {
            if (!mountedRef.current) return;

            if (profile) {
              // Profil trouvé — vérifier si actif
              if (!profile.is_active) {
                setError('Ce compte a été désactivé.');
                await supabase.auth.signOut();
                setUser(null);
                return;
              }
              setUser(profile);
              // Mettre à jour last_login (non bloquant)
              supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', profile.id).then(() => {});
            } else if (newSession.user.app_metadata?.provider === 'google') {
              // Vérifier le domaine email
              const emailDomain = newSession.user.email?.split('@')[1]?.toLowerCase();
              if (!emailDomain || !ALLOWED_DOMAINS.includes(emailDomain)) {
                if (mountedRef.current) {
                  setError('Domaine email non autorisé. Seuls les domaines @lets-clic.com, @wedig.fr et @deux.io sont acceptés.');
                  await supabase.auth.signOut();
                  setUser(null);
                }
                return;
              }
              // Utilisateur OAuth sans profil — auto-provisionner
              const provisioned = await autoProvision(newSession.user);
              if (mountedRef.current) {
                if (provisioned) {
                  setUser(provisioned);
                } else {
                  setError('Impossible de créer votre profil. Contactez un administrateur.');
                  await supabase.auth.signOut();
                  setUser(null);
                }
              }
            } else {
              setUser(null);
            }
          });
        } else {
          setUser(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  // Connexion avec email/password
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setIsLoading(false);
        return { success: false, error: signInError.message };
      }

      if (data.user) {
        // Charger le profil utilisateur
        const profile = await loadUserProfile(data.user.id);

        if (!profile) {
          await supabase.auth.signOut();
          setIsLoading(false);
          return { success: false, error: 'Profil utilisateur non trouvé. Contactez un administrateur.' };
        }

        if (!profile.is_active) {
          await supabase.auth.signOut();
          setIsLoading(false);
          return { success: false, error: 'Ce compte a été désactivé.' };
        }

        // Mettre à jour le last_login (non bloquant)
        supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', profile.id)
          .then(() => {});

        setUser(profile);
      }

      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      return { success: false, error: 'Une erreur est survenue' };
    }
  };

  // Connexion avec Google OAuth
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setError(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        return { success: false, error: oauthError.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Erreur lors de la connexion Google' };
    }
  };

  // Inscription avec email/password
  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setIsLoading(false);
        return { success: false, error: signUpError.message };
      }

      setIsLoading(false);
      return {
        success: true,
        error: data.user?.identities?.length === 0
          ? 'Un compte existe déjà avec cet email'
          : undefined,
      };
    } catch (err) {
      setIsLoading(false);
      return { success: false, error: 'Une erreur est survenue' };
    }
  };

  // Déconnexion
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erreur signOut:', err);
    }
    setAuthUser(null);
    setUser(null);
    setSession(null);
  };

  // Valeurs calculées
  const isAuthenticated = !!authUser;
  const isSuperAdmin = user?.role_id === SUPER_ADMIN_ROLE_ID;
  const isPrimarySuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  return (
    <AuthContext.Provider
      value={{
        authUser,
        user,
        session,
        isLoading,
        isAuthenticated,
        isSuperAdmin,
        isPrimarySuperAdmin,
        error,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshProfile,
        retry,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}

// Export des constantes
export { SUPER_ADMIN_ROLE_ID, SUPER_ADMIN_EMAIL };
