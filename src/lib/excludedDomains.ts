import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Liste noire globale de domaines (reglee dans Parametres) : des sites deja
// verifies comme non pertinents pour la veille, a ne plus jamais scraper.
export async function getExcludedDomains(): Promise<string[]> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 'global'));
  if (!row?.excludedDomains) return [];
  try {
    const parsed = JSON.parse(row.excludedDomains);
    return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === 'string' && d.trim() !== '') : [];
  } catch {
    return [];
  }
}

// Un domaine de la liste exclut aussi ses sous-domaines (ex: "exemple.fr"
// exclut aussi "www.exemple.fr").
export function isDomainExcluded(url: string, excludedDomains: string[]): boolean {
  if (excludedDomains.length === 0) return false;
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return excludedDomains.some((raw) => {
    const domain = raw.trim().toLowerCase();
    if (!domain) return false;
    return hostname === domain || hostname.endsWith(`.${domain}`);
  });
}
