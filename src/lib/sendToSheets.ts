import { db } from '@/lib/db';
import { scrapeJobs, scrapeResults } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function sendJobToSheets(jobId: string, webhookUrl?: string): Promise<{ success: boolean; error?: string }> {
  const [job] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, jobId));
  if (!job) return { success: false, error: 'Job non trouvé' };

  const url = webhookUrl || job.googleSheetsWebhookUrl;
  if (!url) return { success: false, error: 'Aucune URL de webhook configurée' };

  const results = await db.select().from(scrapeResults).where(eq(scrapeResults.jobId, jobId));

  const payload = {
    job: { id: job.id, name: job.name, status: job.status, total_results: job.totalResults, finished_at: job.finishedAt },
    results: results.map(r => ({ type: r.resultType, value: r.value, source_url: r.sourceUrl ?? '', label: r.label ?? '', context: r.context ?? '' })),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return { success: false, error: `Webhook a répondu ${response.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error)?.message || 'Erreur réseau' };
  }
}
