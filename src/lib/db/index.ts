import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Auto-migration: add columns introduced after initial schema
client.execute('ALTER TABLE scrape_jobs ADD COLUMN google_sheets_webhook_url TEXT').catch(() => {});
client.execute('ALTER TABLE scrape_jobs ADD COLUMN schedule TEXT').catch(() => {});
client.execute('ALTER TABLE scrape_jobs ADD COLUMN next_run_at TEXT').catch(() => {});
client.execute('ALTER TABLE scrape_jobs ADD COLUMN ai_auto_score INTEGER NOT NULL DEFAULT 0').catch(() => {});
client.execute('ALTER TABLE scrape_results ADD COLUMN ai_score INTEGER').catch(() => {});
client.execute(`CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  openrouter_api_key TEXT,
  ai_model TEXT,
  updated_at TEXT NOT NULL
)`).catch(() => {});
