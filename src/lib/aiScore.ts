import { db } from '@/lib/db';
import { scrapeResults } from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';

// Construit le prompt de qualification (barème /10) à partir d'un résultat keyword_match.
// La "formule IA" est centralisée ici — facile à adapter.
function buildPrompt(value: string, context: string | null, sourceUrl: string | null): string {
  const infos = [
    sourceUrl ? `Source : ${sourceUrl}` : '',
    `Mots-clés trouvés : ${value}`,
    `Contexte : ${context || '(aucun)'}`,
  ].filter(Boolean).join('\n');

  return `${infos}

Tu qualifies des informations détectées pour OUEST ACRO, entreprise de travaux et d'inspections en accès difficile / en hauteur (cordistes) sur des ouvrages d'art et structures : ponts, viaducs, façades, clochers, châteaux d'eau, falaises, pylônes, silos, cheminées, toitures, stades, zéniths, édifices.

En te basant SURTOUT sur le "Contexte" ci-dessus, attribue une note de 0 à 10 évaluant la probabilité qu'il s'agisse d'une vraie opportunité commerciale : un besoin ACTUEL ou À VENIR de travaux, inspection, diagnostic, rénovation, réfection, renforcement ou mise en sécurité sur l'une de ces structures (y compris appel d'offres, consultation, marché public, ou signal de dégradation : fissure, péril, éboulement, chute de pierres).

Barème :
- 9-10 : opportunité claire (besoin explicite actuel/à venir, ou appel d'offres, sur une structure concernée)
- 6-8 : opportunité probable, à confirmer
- 3-5 : incertain, signal faible ou ambigu
- 0-2 : faux positif (coïncidence de mots-clés, travaux DÉJÀ réalisés/passés, structure non concernée, hors sujet)

Réponds STRICTEMENT par un seul nombre entier de 0 à 10, sans aucun autre texte.`;
}

function parseScore(text: string): number | null {
  const m = String(text).match(/\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(',', '.'));
  if (isNaN(n)) return null;
  return Math.max(0, Math.min(10, Math.round(n)));
}

async function callOpenRouter(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('CONFIG: OPENROUTER_API_KEY non configurée sur le serveur');
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 16,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenRouter ${res.status}`);
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Réponse OpenRouter inattendue');
  return content;
}

async function countRemaining(jobId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(scrapeResults)
    .where(and(
      eq(scrapeResults.jobId, jobId),
      eq(scrapeResults.resultType, 'keyword_match'),
      isNull(scrapeResults.aiScore),
    ));
  return Number(row?.count) || 0;
}

export interface ScoreBatchResult {
  scored: number;
  remaining: number;
  error?: string;
}

/**
 * Note un lot de résultats keyword_match non encore notés pour un job.
 * Traite au plus `limit` résultats puis renvoie le nombre restant — le client
 * rappelle jusqu'à remaining === 0 (évite les timeouts de fonction serverless).
 */
export async function scoreJobBatch(jobId: string, limit = 10): Promise<ScoreBatchResult> {
  const pending = await db
    .select()
    .from(scrapeResults)
    .where(and(
      eq(scrapeResults.jobId, jobId),
      eq(scrapeResults.resultType, 'keyword_match'),
      isNull(scrapeResults.aiScore),
    ))
    .limit(limit);

  let scored = 0;

  for (const r of pending) {
    let reply: string;
    try {
      reply = await callOpenRouter(buildPrompt(r.value, r.context, r.sourceUrl));
    } catch (e) {
      const msg = (e as Error).message || 'Erreur OpenRouter';
      // Erreur de config ou transitoire (réseau/quota) : on interrompt sans
      // marquer les lignes, pour que l'utilisateur puisse réessayer plus tard.
      return { scored, remaining: await countRemaining(jobId), error: msg };
    }

    const score = parseScore(reply);
    // Score lisible → on enregistre ; réponse illisible → sentinelle -1 (évite de reboucler).
    await db.update(scrapeResults)
      .set({ aiScore: score !== null ? score : -1 })
      .where(eq(scrapeResults.id, r.id));
    if (score !== null) scored++;
  }

  return { scored, remaining: await countRemaining(jobId) };
}
