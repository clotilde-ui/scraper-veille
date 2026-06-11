// Supabase auth stubs — replaced by simple password auth via /api/auth/login
// These stubs exist to prevent compilation errors from any remaining imports

export async function signInWithEmail(_email: string, _password: string) {
  throw new Error('Supabase auth removed. Use /api/auth/login instead.');
}

export async function signUpWithEmail(_email: string, _password: string) {
  throw new Error('Supabase auth removed.');
}

export async function signOut() {
  throw new Error('Supabase auth removed. Use /api/auth/logout instead.');
}

export async function getCurrentSession() {
  return { session: null, error: null };
}

export async function getCurrentAuthUser() {
  return { user: null, error: null };
}

export async function getUserProfile() {
  return { user: null, error: null };
}

export async function getUserByEmail(_email: string) {
  return { user: null, error: null };
}

export async function updateLastLogin(_userId: string) {
  return { error: null };
}

export function onAuthStateChange(_callback: (event: string, session: unknown) => void) {
  return { unsubscribe: () => {} };
}
