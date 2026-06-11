import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeUrls } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId requis' }, { status: 400 });
    }

    const urls = await db
      .select()
      .from(scrapeUrls)
      .where(eq(scrapeUrls.jobId, jobId))
      .orderBy(asc(scrapeUrls.depth), asc(scrapeUrls.createdAt));

    return NextResponse.json(urls);
  } catch (error) {
    console.error('Error fetching urls:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const urlsData = Array.isArray(body) ? body : [body];

    if (urlsData.length === 0) {
      return NextResponse.json([], { status: 201 });
    }

    const now = new Date().toISOString();
    const toInsert = urlsData.map((u) => ({
      id: u.id || crypto.randomUUID(),
      jobId: u.jobId || u.job_id,
      url: u.url,
      status: u.status || 'pending',
      depth: u.depth ?? 0,
      parentUrlId: u.parentUrlId || u.parent_url_id || null,
      httpStatus: u.httpStatus || u.http_status || null,
      errorMessage: u.errorMessage || u.error_message || null,
      pageTitle: u.pageTitle || u.page_title || null,
      scrapedAt: u.scrapedAt || u.scraped_at || null,
      createdAt: u.createdAt || u.created_at || now,
    }));

    await db.insert(scrapeUrls).values(toInsert);

    return NextResponse.json(toInsert, { status: 201 });
  } catch (error) {
    console.error('Error creating urls:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
