import { createBrowserClient } from '@supabase/ssr';

// Client Supabase pour utilisation côté client (browser)
// Note: On utilise un client non typé pour éviter les incompatibilités avec les types générés
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Désactivé : on gère l'échange du code OAuth manuellement
        // dans /auth/callback pour éviter le double-échange
        detectSessionInUrl: false,
      },
    }
  );
}

// Singleton pour éviter de créer plusieurs instances
let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createClient();
  }
  return client;
}
