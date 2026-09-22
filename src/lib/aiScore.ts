import { db } from '@/lib/db';
import { scrapeResults, scrapeJobs, appSettings } from '@/lib/db/schema';
import { eq, and, isNull, inArray, sql, type SQL } from 'drizzle-orm';
import { DEFAULT_AI_MODEL } from '@/lib/aiModels';
import { DEFAULT_AI_INSTRUCTIONS } from '@/lib/aiPromptDefaults';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface JobContext {
  name: string;
  keywordsInclude: string[];
  aiPrompt: string | null;
}

// Construit le prompt de qualification (barème /10). Les infos dynamiques
// (source, mots-clés, contexte) et la contrainte de format de reponse sont
// toujours fixes ; seules les instructions d'evaluation sont personnalisables
// par job (job.aiPrompt), sinon on retombe sur le barème générique par défaut.
function buildPrompt(job: JobContext, value: string, context: string | null, sourceUrl: string | null): string {
  const infos = [
    sourceUrl ? `Source : ${sourceUrl}` : '',
    `Mots-clés recherchés : ${job.keywordsInclude.join(', ') || '(aucun)'}`,
    `Correspondance trouvée : ${value}`,
    `Contexte : ${context || '(aucun)'}`,
  ].filter(Boolean).join('\n');

  const instructions = (job.aiPrompt && job.aiPrompt.trim()) || DEFAULT_AI_INSTRUCTIONS;

  return `Tu qualifies un résultat de veille automatisée pour le projet "${job.name}".

${infos}

${instructions}

Réponds STRICTEMENT par un seul nombre entier de 0 à 10, sans aucun autre texte.`;
}

function parseScore(text: string): number | null {
  const m = String(text).match(/\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(',', '.'));
  if (isNaN(n)) return null;
  return Math.max(0, Math.min(10, Math.round(n)));
}

async function getAiSettings(): Promise<{ apiKey: string | null; model: string }> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 'global'));
  return {
    apiKey: row?.openrouterApiKey ?? null,
    model: row?.aiModel || DEFAULT_AI_MODEL,
  };
}

async function callOpenRouter(prompt: string): Promise<string> {
  const { apiKey, model } = await getAiSettings();
  if (!apiKey) throw new Error("CONFIG: Clé API OpenRouter non configurée (onglet Paramètres)");

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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

function scopeConditions(jobId: string, resultIds?: string[]): SQL[] {
  const conditions = [
    eq(scrapeResults.jobId, jobId),
    eq(scrapeResults.resultType, 'keyword_match'),
    isNull(scrapeResults.aiScore),
  ];
  if (resultIds && resultIds.length > 0) conditions.push(inArray(scrapeResults.id, resultIds));
  return conditions;
}

async function countRemaining(jobId: string, resultIds?: string[]): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(scrapeResults)
    .where(and(...scopeConditions(jobId, resultIds)));
  return Number(row?.count) || 0;
}

export interface ScoreBatchResult {
  scored: number;
  remaining: number;
  error?: string;
}

/**
 * Note un lot de résultats keyword_match non encore notés pour un job.
 * Si `resultIds` est fourni, ne traite que ces résultats (sélection manuelle
 * de l'utilisateur) ; sinon, traite tous les résultats non notés du job.
 * Traite au plus `limit` résultats puis renvoie le nombre restant — le client
 * rappelle jusqu'à remaining === 0 (évite les timeouts de fonction serverless).
 */
export async function scoreJobBatch(jobId: string, limit = 10, resultIds?: string[]): Promise<ScoreBatchResult> {
  const [job] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, jobId));
  if (!job) return { scored: 0, remaining: 0, error: 'Job introuvable' };

  const jobContext: JobContext = {
    name: job.name,
    keywordsInclude: job.keywords ? (JSON.parse(job.keywords)?.include ?? []) : [],
    aiPrompt: job.aiPrompt ?? null,
  };

  const pending = await db
    .select()
    .from(scrapeResults)
    .where(and(...scopeConditions(jobId, resultIds)))
    .limit(limit);

  let scored = 0;

  for (const r of pending) {
    let reply: string;
    try {
      reply = await callOpenRouter(buildPrompt(jobContext, r.value, r.context, r.sourceUrl));
    } catch (e) {
      const msg = (e as Error).message || 'Erreur OpenRouter';
      // Erreur de config ou transitoire (réseau/quota) : on interrompt sans
      // marquer les lignes, pour que l'utilisateur puisse réessayer plus tard.
      return { scored, remaining: await countRemaining(jobId, resultIds), error: msg };
    }

    const score = parseScore(reply);
    // Score lisible → on enregistre ; réponse illisible → sentinelle -1 (évite de reboucler).
    await db.update(scrapeResults)
      .set({ aiScore: score !== null ? score : -1 })
      .where(eq(scrapeResults.id, r.id));
    if (score !== null) scored++;
  }

  return { scored, remaining: await countRemaining(jobId, resultIds) };
}
