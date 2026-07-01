import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeJobs } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const jobs = await db.select().from(scrapeJobs).orderBy(desc(scrapeJobs.createdAt));
    return NextResponse.json(jobs.map(j => ({ ...j, keywords: j.keywords ? JSON.parse(j.keywords) : null })));
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await db.insert(scrapeJobs).values({
      id,
      name: body.name,
      status: body.status || 'pending',
      scrapeType: body.scrapeType || body.scrape_type || 'links',
      crawlDepth: body.crawlDepth ?? body.crawl_depth ?? 1,
      keywords: body.keywords ? JSON.stringify(body.keywords) : null,
      totalUrls: 0,
      completedUrls: 0,
      failedUrls: 0,
      totalResults: 0,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, id));
    return NextResponse.json({ ...created, keywords: body.keywords || null }, { status: 201 });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
