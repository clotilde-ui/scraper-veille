import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeResults } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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

    const results = rows.map(r => ({
      ...r,
      metadata: r.metadata ? (() => { try { return JSON.parse(r.metadata as string); } catch { return null; } })() : null,
    }));

    return NextResponse.json({
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Erreur API results:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
