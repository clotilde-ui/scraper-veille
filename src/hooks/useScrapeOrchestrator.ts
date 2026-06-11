'use client';

import { useState, useRef, useCallback } from 'react';

const MAX_DISCOVERED_PER_DEPTH = 50;
const CONCURRENCY = 5;

interface OrchestratorConfig {
  jobId: string;
  scrapeType: string;
  crawlDepth: number;
  keywords: string[];
  excludeKeywords: string[];
}

interface ScrapeUrlRow {
  id: string;
  job_id?: string;
  jobId?: string;
  url: string;
  status: string;
  depth: number;
  parent_url_id?: string | null;
  parentUrlId?: string | null;
}

export function useScrapeOrchestrator() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentUrls, setCurrentUrls] = useState<string[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);

  const apiPatch = async (path: string, data: Record<string, unknown>) => {
    await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  };

  const processJob = useCallback(async (config: OrchestratorConfig, isResume = false) => {
    const { jobId, scrapeType, crawlDepth, keywords, excludeKeywords } = config;
    setIsRunning(true);
    setIsPaused(false);
    setProcessedCount(0);
    pausedRef.current = false;
    abortRef.current = new AbortController();

    // Mark job as running
    await apiPatch(`/api/scraper/jobs/${jobId}`, {
      status: 'running',
      ...(!isResume ? { startedAt: new Date().toISOString() } : {}),
    });

    try {
      for (let depth = 0; depth <= crawlDepth - 1; depth++) {
        if (abortRef.current?.signal.aborted) break;

        // Fetch pending URLs at this depth
        const urlsRes = await fetch(`/api/scraper/urls?jobId=${encodeURIComponent(jobId)}`);
        const allUrls: ScrapeUrlRow[] = urlsRes.ok ? await urlsRes.json() : [];
        const pendingUrls = allUrls.filter(
          u => u.depth === depth && (u.status === 'pending' || u.status === 'scraping')
        );

        if (pendingUrls.length === 0) continue;

        let nextIndex = 0;
        const activeUrlsSet = new Set<string>();

        const worker = async () => {
          while (true) {
            if (abortRef.current?.signal.aborted) return;

            while (pausedRef.current) {
              await new Promise(r => setTimeout(r, 500));
              if (abortRef.current?.signal.aborted) return;
            }

            const index = nextIndex++;
            if (index >= pendingUrls.length) return;

            const urlRow = pendingUrls[index];

            activeUrlsSet.add(urlRow.url);
            setCurrentUrls([...activeUrlsSet]);

            // Mark URL as scraping
            await fetch(`/api/scraper/urls/${urlRow.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'scraping' }),
            });

            try {
              const response = await fetch('/api/scraper/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jobId,
                  urlId: urlRow.id,
                  url: urlRow.url,
                  scrapeType,
                  keywords,
                  excludeKeywords,
                }),
                signal: abortRef.current?.signal,
              });

              let data: { internalLinks?: string[]; error?: string } = {};
              try {
                data = await response.json();
              } catch {
                console.error('Réponse API non-JSON pour:', urlRow.url);
              }

              if (response.ok && !data.error) {
                if (depth < crawlDepth - 1 && data.internalLinks && data.internalLinks.length > 0) {
                  // Get existing URLs to avoid duplicates
                  const existingRes = await fetch(`/api/scraper/urls?jobId=${encodeURIComponent(jobId)}`);
                  const existingUrls: ScrapeUrlRow[] = existingRes.ok ? await existingRes.json() : [];
                  const existingSet = new Set(existingUrls.map(u => u.url));

                  const newLinks = data.internalLinks
                    .filter((link: string) => !existingSet.has(link))
                    .slice(0, MAX_DISCOVERED_PER_DEPTH);

                  if (newLinks.length > 0) {
                    const newUrlsData = newLinks.map((link: string) => ({
                      id: crypto.randomUUID(),
                      jobId,
                      url: link,
                      status: 'pending',
                      depth: depth + 1,
                      parentUrlId: urlRow.id,
                    }));

                    await fetch('/api/scraper/urls', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newUrlsData),
                    });

                    // Update total_urls count
                    const updatedRes = await fetch(`/api/scraper/urls?jobId=${encodeURIComponent(jobId)}`);
                    const updatedUrls: ScrapeUrlRow[] = updatedRes.ok ? await updatedRes.json() : [];
                    await apiPatch(`/api/scraper/jobs/${jobId}`, {
                      totalUrls: updatedUrls.length,
                    });
                  }
                }
              }
            } catch (err: unknown) {
              if ((err as Error)?.name === 'AbortError') return;

              console.error('Erreur réseau orchestrateur:', urlRow.url, (err as Error)?.message);
              await fetch(`/api/scraper/urls/${urlRow.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'failed',
                  errorMessage: (err as Error)?.message || 'Erreur réseau locale',
                  scrapedAt: new Date().toISOString(),
                }),
              });
            } finally {
              activeUrlsSet.delete(urlRow.url);
              setCurrentUrls([...activeUrlsSet]);
              setProcessedCount(prev => prev + 1);
            }
          }
        };

        const workerCount = Math.min(CONCURRENCY, pendingUrls.length);
        await Promise.allSettled(Array.from({ length: workerCount }, () => worker()));
      }

      // Finish job
      if (!abortRef.current?.signal.aborted) {
        const finalUrlsRes = await fetch(`/api/scraper/urls?jobId=${encodeURIComponent(jobId)}`);
        const finalUrls: ScrapeUrlRow[] = finalUrlsRes.ok ? await finalUrlsRes.json() : [];

        const completedCount = finalUrls.filter(u => u.status === 'completed' || u.status === 'skipped').length;
        const failedCount = finalUrls.filter(u => u.status === 'failed').length;

        const resultsRes = await fetch(`/api/scraper/results?jobId=${encodeURIComponent(jobId)}&limit=1`);
        const resultsData = resultsRes.ok ? await resultsRes.json() : { total: 0 };

        await apiPatch(`/api/scraper/jobs/${jobId}`, {
          status: 'completed',
          finishedAt: new Date().toISOString(),
          totalUrls: finalUrls.length,
          completedUrls: completedCount,
          failedUrls: failedCount,
          totalResults: resultsData.total || 0,
        });
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Erreur orchestration:', err);
        await apiPatch(`/api/scraper/jobs/${jobId}`, {
          status: 'failed',
          errorMessage: (err as Error)?.message || 'Erreur orchestration',
          finishedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsRunning(false);
      setCurrentUrls([]);
      setProcessedCount(0);
    }
  }, []);

  const start = useCallback((config: OrchestratorConfig) => {
    processJob(config, false);
  }, [processJob]);

  const pause = useCallback(async (jobId: string) => {
    pausedRef.current = true;
    setIsPaused(true);
    await apiPatch(`/api/scraper/jobs/${jobId}`, { status: 'paused' });
  }, []);

  const resume = useCallback((config: OrchestratorConfig) => {
    if (isRunning) {
      pausedRef.current = false;
      setIsPaused(false);
      apiPatch(`/api/scraper/jobs/${config.jobId}`, { status: 'running' });
    } else {
      processJob(config, true);
    }
  }, [isRunning, processJob]);

  const cancel = useCallback(async (jobId: string) => {
    abortRef.current?.abort();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentUrls([]);
    setProcessedCount(0);
    await apiPatch(`/api/scraper/jobs/${jobId}`, {
      status: 'cancelled',
      finishedAt: new Date().toISOString(),
    });
  }, []);

  return { isRunning, isPaused, currentUrls, processedCount, start, pause, resume, cancel };
}
