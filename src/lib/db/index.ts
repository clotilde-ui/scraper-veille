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
