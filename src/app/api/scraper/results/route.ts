import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeResults, scrapeJobs } from '@/lib/db/schema';
import { eq, and, or, lt, desc, sql } from 'drizzle-orm';
import { errorMessage } from '@/lib/apiError';

// Pour une veille récurrente (jobs clonés par le cron à partir d'un même job
// planifié), calcule l'identité d'un résultat (type + valeur + page source) et
// renvoie l'ensemble de ces identités trouvées lors de l'exécution précédente
// de la même recherche, afin de distinguer les nouveautés du reste.
async function getPreviousRunSignatures(jobId: string): Promise<Set<string> | null> {
  const [job] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, jobId));
  if (!job) return null;

  const rootId = job.templateJobId ?? job.id;
  const [previousRun] = await db
    .select()
    .from(scrapeJobs)
    .where(and(
      or(eq(scrapeJobs.id, rootId), eq(scrapeJobs.templateJobId, rootId)),
      lt(scrapeJobs.createdAt, job.createdAt),
    ))
    .orderBy(desc(scrapeJobs.createdAt))
    .limit(1);

  if (!previousRun) return null;

  const previousResults = await db
    .select({ resultType: scrapeResults.resultType, value: scrapeResults.value, sourceUrl: scrapeResults.sourceUrl })
    .from(scrapeResults)
    .where(eq(scrapeResults.jobId, previousRun.id));

  return new Set(previousResults.map(r => `${r.resultType}:${r.value}:${r.sourceUrl ?? ''}`));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const resultType = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = (page - 1) * limit;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId requis' }, { status: 400 });
    }

    const conditions = resultType
      ? and(eq(scrapeResults.jobId, jobId), eq(scrapeResults.resultType, resultType))
      : eq(scrapeResults.jobId, jobId);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scrapeResults)
      .where(conditions);

    const total = Number(countResult?.count) || 0;

    const rows = await db
      .select()
      .from(scrapeResults)
      .where(conditions)
      .orderBy(desc(scrapeResults.createdAt))
      .limit(limit)
      .offset(offset);

    const compareToPrevious = searchParams.get('compareToPrevious') === '1';
    const previousSignatures = compareToPrevious ? await getPreviousRunSignatures(jobId) : null;

    const results = rows.map(r => ({
      ...r,
      metadata: r.metadata ? (() => { try { return JSON.parse(r.metadata as string); } catch { return null; } })() : null,
      isNew: previousSignatures ? !previousSignatures.has(`${r.resultType}:${r.value}:${r.sourceUrl ?? ''}`) : null,
    }));

    return NextResponse.json({
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasPreviousRun: previousSignatures !== null,
    });
  } catch (error) {
    console.error('Erreur API results:', error);
    return NextResponse.json({ error: errorMessage(error, 'Erreur serveur interne') }, { status: 500 });
  }
}
