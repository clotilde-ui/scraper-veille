import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeJobs, scrapeUrls, scrapeResults } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    return NextResponse.json({
      ...job,
      keywords: job.keywords ? JSON.parse(job.keywords) : null,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = { updatedAt: now };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.scrapeType !== undefined) updateData.scrapeType = body.scrapeType;
    if (body.scrape_type !== undefined) updateData.scrapeType = body.scrape_type;
    if (body.crawlDepth !== undefined) updateData.crawlDepth = body.crawlDepth;
    if (body.crawl_depth !== undefined) updateData.crawlDepth = body.crawl_depth;
    if (body.keywords !== undefined) updateData.keywords = body.keywords ? JSON.stringify(body.keywords) : null;
    if (body.totalUrls !== undefined) updateData.totalUrls = body.totalUrls;
    if (body.total_urls !== undefined) updateData.totalUrls = body.total_urls;
    if (body.completedUrls !== undefined) updateData.completedUrls = body.completedUrls;
    if (body.completed_urls !== undefined) updateData.completedUrls = body.completed_urls;
    if (body.failedUrls !== undefined) updateData.failedUrls = body.failedUrls;
    if (body.failed_urls !== undefined) updateData.failedUrls = body.failed_urls;
    if (body.totalResults !== undefined) updateData.totalResults = body.totalResults;
    if (body.total_results !== undefined) updateData.totalResults = body.total_results;
    if (body.errorMessage !== undefined) updateData.errorMessage = body.errorMessage;
    if (body.error_message !== undefined) updateData.errorMessage = body.error_message;
    if (body.startedAt !== undefined) updateData.startedAt = body.startedAt;
    if (body.started_at !== undefined) updateData.startedAt = body.started_at;
    if (body.finishedAt !== undefined) updateData.finishedAt = body.finishedAt;
    if (body.finished_at !== undefined) updateData.finishedAt = body.finished_at;
    if (body.googleSheetsWebhookUrl !== undefined) updateData.googleSheetsWebhookUrl = body.googleSheetsWebhookUrl;
    if (body.schedule !== undefined) updateData.schedule = body.schedule;
    if (body.nextRunAt !== undefined) updateData.nextRunAt = body.nextRunAt;

    await db.update(scrapeJobs).set(updateData).where(eq(scrapeJobs.id, id));

    const [updated] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, id));

    if (!updated) {
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      ...updated,
      keywords: updated.keywords ? JSON.parse(updated.keywords) : null,
    });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(scrapeResults).where(eq(scrapeResults.jobId, id));
    await db.delete(scrapeUrls).where(eq(scrapeUrls.jobId, id));
    await db.delete(scrapeJobs).where(eq(scrapeJobs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
