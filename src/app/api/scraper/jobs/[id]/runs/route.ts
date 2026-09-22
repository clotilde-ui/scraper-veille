import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeJobs } from '@/lib/db/schema';
import { eq, or, desc } from 'drizzle-orm';
import { errorMessage } from '@/lib/apiError';

// Liste les executions passees d'une meme recherche planifiee (le job template
// et tous les jobs clones que le cron a lances a partir de lui), triees de la
// plus recente a la plus ancienne, pour naviguer dans l'historique d'une veille.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [job] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, id));

    if (!job) {
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 });
    }

    const rootId = job.templateJobId ?? job.id;

    const runs = await db
      .select()
      .from(scrapeJobs)
      .where(or(eq(scrapeJobs.id, rootId), eq(scrapeJobs.templateJobId, rootId)))
      .orderBy(desc(scrapeJobs.createdAt));

    return NextResponse.json(runs.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      totalResults: r.totalResults,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      createdAt: r.createdAt,
      isTemplate: r.id === rootId,
    })));
  } catch (error) {
    console.error('Error fetching job runs:', error);
    return NextResponse.json({ error: errorMessage(error, 'Erreur serveur') }, { status: 500 });
  }
}
