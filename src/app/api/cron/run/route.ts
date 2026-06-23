import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeJobs, scrapeUrls } from '@/lib/db/schema';
import { isNotNull, lte, eq, and } from 'drizzle-orm';
import { runJobServerSide } from '@/lib/serverOrchestrator';
import { getNextRunAt } from '@/lib/cronUtils';
import { sendJobToSheets } from '@/lib/sendToSheets';

export const maxDuration = 300; // 5 min max (Vercel Pro)

export async function GET(request: NextRequest) {
  // Sécurité : vérifier le token Vercel Cron ou une clé secrète
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Trouver les jobs planifiés dont nextRunAt est dépassé
  const dueJobs = await db.select().from(scrapeJobs).where(
    and(
      isNotNull(scrapeJobs.schedule),
      lte(scrapeJobs.nextRunAt, now)
    )
  );

  if (dueJobs.length === 0) {
    return NextResponse.json({ message: 'Aucun job planifié à exécuter', checked: now });
  }

  const results: { jobId: string; status: string; error?: string }[] = [];

  for (const job of dueJobs) {
    // Éviter les doublons si le job tourne déjà
    if (job.status === 'running') {
      results.push({ jobId: job.id, status: 'skipped_running' });
      continue;
    }

    // Cloner le job : créer une nouvelle instance avec les mêmes paramètres
    const newJobId = crypto.randomUUID();
    const newNow = new Date().toISOString();

    try {
      // Récupérer les URLs originales du job template
      const templateUrls = await db.select().from(scrapeUrls).where(
        and(eq(scrapeUrls.jobId, job.id), eq(scrapeUrls.depth, 0))
      );

      // Créer le nouveau job
      await db.insert(scrapeJobs).values({
        id: newJobId,
        name: job.name,
        status: 'pending',
        scrapeType: job.scrapeType,
        crawlDepth: job.crawlDepth,
        keywords: job.keywords,
        totalUrls: templateUrls.length,
        completedUrls: 0,
        failedUrls: 0,
        totalResults: 0,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
        googleSheetsWebhookUrl: job.googleSheetsWebhookUrl,
        schedule: null, // le clone n'a pas de schedule
        nextRunAt: null,
        createdAt: newNow,
        updatedAt: newNow,
      });

      // Copier les URLs racines
      if (templateUrls.length > 0) {
        await db.insert(scrapeUrls).values(templateUrls.map(u => ({
          id: crypto.randomUUID(),
          jobId: newJobId,
          url: u.url,
          status: 'pending' as const,
          depth: 0,
          parentUrlId: null,
          httpStatus: null,
          errorMessage: null,
          pageTitle: null,
          scrapedAt: null,
          createdAt: newNow,
        })));
      }

      // Lancer le scraping server-side puis envoyer vers Google Sheets si configuré
      runJobServerSide(newJobId).then(async () => {
        if (job.googleSheetsWebhookUrl) {
          const sheetsResult = await sendJobToSheets(newJobId, job.googleSheetsWebhookUrl);
          if (!sheetsResult.success) console.error('Erreur envoi Google Sheets après cron:', sheetsResult.error);
        }
      }).catch(err => console.error('Erreur job cron:', err));

      // Mettre à jour nextRunAt sur le job template
      if (job.schedule) {
        const nextRun = getNextRunAt(job.schedule);
        await db.update(scrapeJobs).set({ nextRunAt: nextRun, updatedAt: newNow }).where(eq(scrapeJobs.id, job.id));
      }

      results.push({ jobId: newJobId, status: 'launched' });
    } catch (err) {
      console.error('Erreur lancement job cron:', err);
      results.push({ jobId: job.id, status: 'error', error: (err as Error)?.message });
    }
  }

  return NextResponse.json({ results, checked: now });
}
