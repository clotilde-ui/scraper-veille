import { db } from '@/lib/db';
import { scrapeJobs, scrapeUrls } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { scrapeUrl, updateJobCounters } from '@/lib/scrapeUrl';
import { scoreJobBatch } from '@/lib/aiScore';

const MAX_DISCOVERED_PER_DEPTH = 50;
const CONCURRENCY = 3;

export async function runJobServerSide(jobId: string): Promise<void> {
  const [job] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, jobId));
  if (!job) throw new Error(`Job ${jobId} non trouvé`);

  let scrapeTypes: string[];
  try { scrapeTypes = JSON.parse(job.scrapeType); } catch { scrapeTypes = [job.scrapeType]; }

  const keywords: string[] = job.keywords ? JSON.parse(job.keywords)?.include ?? [] : [];
  const excludeKeywords: string[] = job.keywords ? JSON.parse(job.keywords)?.exclude ?? [] : [];
  const crawlDepth = job.crawlDepth;

  await db.update(scrapeJobs).set({ status: 'running', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(scrapeJobs.id, jobId));

  try {
    for (let depth = 0; depth < crawlDepth; depth++) {
      const allUrls = await db.select().from(scrapeUrls).where(eq(scrapeUrls.jobId, jobId));
      const pendingUrls = allUrls.filter(u => u.depth === depth && (u.status === 'pending' || u.status === 'scraping'));

      if (pendingUrls.length === 0) continue;

      let nextIndex = 0;
      const worker = async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= pendingUrls.length) return;
          const urlRow = pendingUrls[index];

          await db.update(scrapeUrls).set({ status: 'scraping' }).where(eq(scrapeUrls.id, urlRow.id));

          try {
            const result = await scrapeUrl({ jobId, urlId: urlRow.id, url: urlRow.url, scrapeTypes, keywords, excludeKeywords });

            if (depth < crawlDepth - 1 && result.internalLinks.length > 0) {
              const existingUrls = await db.select().from(scrapeUrls).where(eq(scrapeUrls.jobId, jobId));
              const existingSet = new Set(existingUrls.map(u => u.url));
              const newLinks = result.internalLinks.filter(l => !existingSet.has(l)).slice(0, MAX_DISCOVERED_PER_DEPTH);

              if (newLinks.length > 0) {
                const now = new Date().toISOString();
                await db.insert(scrapeUrls).values(newLinks.map(link => ({
                  id: crypto.randomUUID(),
                  jobId,
                  url: link,
                  status: 'pending',
                  depth: depth + 1,
                  parentUrlId: urlRow.id,
                  createdAt: now,
                })));

                const updatedUrls = await db.select().from(scrapeUrls).where(eq(scrapeUrls.jobId, jobId));
                await db.update(scrapeJobs).set({ totalUrls: updatedUrls.length, updatedAt: now }).where(eq(scrapeJobs.id, jobId));
              }
            }
          } catch (err) {
            console.error('Erreur scraping URL:', urlRow.url, err);
            await db.update(scrapeUrls).set({ status: 'failed', errorMessage: (err as Error)?.message || 'Erreur inconnue', scrapedAt: new Date().toISOString() }).where(eq(scrapeUrls.id, urlRow.id));
            await updateJobCounters(jobId);
          }
        }
      };

      const workerCount = Math.min(CONCURRENCY, pendingUrls.length);
      await Promise.allSettled(Array.from({ length: workerCount }, () => worker()));
    }

    const finalUrls = await db.select().from(scrapeUrls).where(eq(scrapeUrls.jobId, jobId));
    const completedCount = finalUrls.filter(u => u.status === 'completed' || u.status === 'skipped').length;
    const failedCount = finalUrls.filter(u => u.status === 'failed').length;

    await updateJobCounters(jobId);

    await db.update(scrapeJobs).set({
      status: 'completed',
      finishedAt: new Date().toISOString(),
      totalUrls: finalUrls.length,
      completedUrls: completedCount,
      failedUrls: failedCount,
      updatedAt: new Date().toISOString(),
    }).where(eq(scrapeJobs.id, jobId));

    // Scoring IA automatique en fin de scraping (si activé sur le job)
    if (job.aiAutoScore) {
      try {
        let guard = 0;
        let remaining = Infinity;
        while (remaining > 0 && guard++ < 500) {
          const r = await scoreJobBatch(jobId, 10);
          remaining = r.remaining;
          if (r.error) { console.error('Scoring auto interrompu:', r.error); break; }
        }
      } catch (e) {
        console.error('Erreur scoring auto serveur:', e);
      }
    }
  } catch (err) {
    console.error('Erreur orchestration serveur:', err);
    await db.update(scrapeJobs).set({ status: 'failed', errorMessage: (err as Error)?.message || 'Erreur inconnue', finishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(scrapeJobs.id, jobId));
  }
}
