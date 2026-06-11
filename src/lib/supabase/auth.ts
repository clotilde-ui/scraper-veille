'use client';

import { getSupabaseClient } from './client';
import type { DbUser, DbUserWithRole } from '@/types/supabase';

// Service d'authentification Supabase

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error: error?.message || null };
}

export async function getCurrentAuthUser() {
  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error: error?.message || null };
}

// Récupérer le profil utilisateur depuis la table users
export async function getUserProfile(): Promise<{ user: DbUserWithRole | null; error: string | null }> {
  const supabase = getSupabaseClient();

  // D'abord récupérer l'utilisateur auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { user: null, error: authError?.message || 'Non authentifié' };
  }

  // Récupérer le profil depuis la table users
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      roles (*)
    `)
    .eq('auth_id', authUser.id)
    .single();

  if (error) {
    // Si l'utilisateur n'existe pas encore dans la table users, on le crée
    if (error.code === 'PGRST116') {
      return { user: null, error: 'Profil utilisateur non trouvé' };
    }
    return { user: null, error: error.message };
  }

  return { user: data as DbUserWithRole, error: null };
}

// Récupérer un profil utilisateur par email
export async function getUserByEmail(email: string): Promise<{ user: DbUserWithRole | null; error: string | null }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      roles (*)
    `)
    .eq('email', email)
    .single();

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data as DbUserWithRole, error: null };
}

// Mettre à jour le last_login
export async function updateLastLogin(userId: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);

  return { error: error?.message || null };
}

// Écouter les changements d'authentification
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  const supabase = getSupabaseClient();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
}
