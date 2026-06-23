import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeJobs, scrapeUrls, scrapeResults } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const now = new Date().toISOString();

    // Mettre à jour la config du job
    const updateData: Record<string, unknown> = {
      updatedAt: now, status: 'pending',
      startedAt: null, finishedAt: null,
      completedUrls: 0, failedUrls: 0, totalResults: 0, errorMessage: null,
    };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.scrapeType !== undefined) updateData.scrapeType = body.scrapeType;
    if (body.crawlDepth !== undefined) updateData.crawlDepth = body.crawlDepth;
    if (body.keywords !== undefined) updateData.keywords = body.keywords ? JSON.stringify(body.keywords) : null;

    // Supprimer tous les résultats
    await db.delete(scrapeResults).where(eq(scrapeResults.jobId, id));

    if (body.urls && body.urls.length > 0) {
      // Nouvelles URLs fournies : tout supprimer et recréer
      await db.delete(scrapeUrls).where(eq(scrapeUrls.jobId, id));
      await db.insert(scrapeUrls).values(body.urls.map((url: string) => ({
        id: crypto.randomUUID(),
        jobId: id,
        url,
        status: 'pending',
        depth: 0,
        parentUrlId: null,
        httpStatus: null,
        errorMessage: null,
        pageTitle: null,
        scrapedAt: null,
        createdAt: now,
      })));
      updateData.totalUrls = body.urls.length;
    } else {
      // Supprimer les URLs découvertes (depth > 0) et remettre les depth=0 à pending
      await db.delete(scrapeUrls).where(and(eq(scrapeUrls.jobId, id), gt(scrapeUrls.depth, 0)));
      await db.update(scrapeUrls).set({
        status: 'pending', httpStatus: null, errorMessage: null, pageTitle: null, scrapedAt: null,
      }).where(and(eq(scrapeUrls.jobId, id), eq(scrapeUrls.depth, 0)));
      const remaining = await db.select().from(scrapeUrls).where(eq(scrapeUrls.jobId, id));
      updateData.totalUrls = remaining.length;
    }

    await db.update(scrapeJobs).set(updateData).where(eq(scrapeJobs.id, id));

    const [updated] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, id));
    return NextResponse.json({ ...updated, keywords: updated.keywords ? JSON.parse(updated.keywords) : null });
  } catch (error) {
    console.error('Error resetting job:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
