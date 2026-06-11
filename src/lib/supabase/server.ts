// Supabase server stubs — replaced by Turso + Drizzle ORM
// These stubs prevent compilation errors from any remaining imports

export async function createClient() {
  throw new Error('Supabase has been removed. Use Drizzle ORM via @/lib/db instead.');
}

export function createAdminClient() {
  throw new Error('Supabase has been removed. Use Drizzle ORM via @/lib/db instead.');
}
