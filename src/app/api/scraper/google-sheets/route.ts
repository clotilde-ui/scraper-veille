import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeJobs, scrapeResults } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { jobId, webhookUrl: bodyWebhookUrl } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'jobId requis' }, { status: 400 });
    }

    const [job] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, jobId));
    if (!job) {
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 });
    }

    const webhookUrl = bodyWebhookUrl || job.googleSheetsWebhookUrl;
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Aucune URL de webhook configurée' }, { status: 400 });
    }

    const results = await db.select().from(scrapeResults).where(eq(scrapeResults.jobId, jobId));

    const payload = {
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        total_results: job.totalResults,
        finished_at: job.finishedAt,
      },
      results: results.map(r => ({
        type: r.resultType,
        value: r.value,
        source_url: r.sourceUrl ?? '',
        label: r.label ?? '',
        context: r.context ?? '',
      })),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { error: `Webhook a répondu ${response.status}`, detail: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, sent: results.length });
  } catch (error) {
    console.error('Error sending to Google Sheets:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
