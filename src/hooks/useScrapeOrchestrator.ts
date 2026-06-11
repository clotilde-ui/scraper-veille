'use client';

import { useState, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

const MAX_DISCOVERED_PER_DEPTH = 50;
const CONCURRENCY = 5; // URLs traitées en parallèle

interface OrchestratorConfig {
  jobId: string;
  scrapeType: string;
  crawlDepth: number;
  keywords: string[];
}

export function useScrapeOrchestrator() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentUrls, setCurrentUrls] = useState<string[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);

  const supabase = getSupabaseClient();

  const processJob = useCallback(async (config: OrchestratorConfig, isResume = false) => {
    const { jobId, scrapeType, crawlDepth, keywords } = config;
    setIsRunning(true);
    setIsPaused(false);
    setProcessedCount(0);
    pausedRef.current = false;
    abortRef.current = new AbortController();

    // Mark job as running
    await supabase.from('scrape_jobs').update({
      status: 'running',
      ...(!isResume ? { started_at: new Date().toISOString() } : {}),
    }).eq('id', jobId);

    try {
      // Process each depth level
      for (let depth = 0; depth <= crawlDepth - 1; depth++) {
        if (abortRef.current?.signal.aborted) break;

        // Fetch pending URLs at this depth (also retry stuck 'scraping' URLs)
        const { data: pendingUrls } = await supabase
          .from('scrape_urls')
          .select('*')
          .eq('job_id', jobId)
          .eq('depth', depth)
          .in('status', ['pending', 'scraping'])
          .order('created_at', { ascending: true });

        if (!pendingUrls || pendingUrls.length === 0) continue;

        // --- Pool de workers concurrents ---
        let nextIndex = 0;
        const activeUrlsSet = new Set<string>();
        let localProcessed = 0;

        const worker = async () => {
          while (true) {
            if (abortRef.current?.signal.aborted) return;

            // Check pause
            while (pausedRef.current) {
              await new Promise(r => setTimeout(r, 500));
              if (abortRef.current?.signal.aborted) return;
            }

            // Pick next URL from queue
            const index = nextIndex++;
            if (index >= pendingUrls.length) return;

            const urlRow = pendingUrls[index];

            // Track active URLs
            activeUrlsSet.add(urlRow.url);
            setCurrentUrls([...activeUrlsSet]);

            // Mark URL as scraping
            await supabase.from('scrape_urls').update({ status: 'scraping' }).eq('id', urlRow.id);

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
                // Insert discovered internal links for next depth
                if (depth < crawlDepth - 1 && data.internalLinks && data.internalLinks.length > 0) {
                  const { data: existingUrls } = await supabase
                    .from('scrape_urls')
                    .select('url')
                    .eq('job_id', jobId);

                  const existingSet = new Set((existingUrls || []).map((u: { url: string }) => u.url));
                  const newLinks = data.internalLinks
                    .filter((link: string) => !existingSet.has(link))
                    .slice(0, MAX_DISCOVERED_PER_DEPTH);

                  if (newLinks.length > 0) {
                    await supabase.from('scrape_urls').insert(
                      newLinks.map((link: string) => ({
                        job_id: jobId,
                        url: link,
                        status: 'pending',
                        depth: depth + 1,
                        parent_url_id: urlRow.id,
                      }))
                    );

                    // Update total_urls count on job
                    const { count: newTotal } = await supabase
                      .from('scrape_urls')
                      .select('*', { count: 'exact', head: true })
                      .eq('job_id', jobId);
                    await supabase.from('scrape_jobs').update({
                      total_urls: newTotal || 0,
                    }).eq('id', jobId);
                  }
                }
              }
            } catch (err: unknown) {
              if ((err as Error)?.name === 'AbortError') return;

              // Network error — mark URL as failed
              console.error('Erreur réseau orchestrateur:', urlRow.url, (err as Error)?.message);
              await supabase.from('scrape_urls').update({
                status: 'failed',
                error_message: (err as Error)?.message || 'Erreur réseau locale',
                scraped_at: new Date().toISOString(),
              }).eq('id', urlRow.id);

              // Update counters manually
              const [failedResult, completedResult] = await Promise.all([
                supabase.from('scrape_urls').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'failed'),
                supabase.from('scrape_urls').select('*', { count: 'exact', head: true }).eq('job_id', jobId).in('status', ['completed', 'skipped']),
              ]);
              await supabase.from('scrape_jobs').update({
                completed_urls: completedResult.count || 0,
                failed_urls: failedResult.count || 0,
              }).eq('id', jobId);
            } finally {
              activeUrlsSet.delete(urlRow.url);
              setCurrentUrls([...activeUrlsSet]);
              localProcessed++;
              setProcessedCount(prev => prev + 1);
            }
          }
        };

        // Launch N workers in parallel
        const workerCount = Math.min(CONCURRENCY, pendingUrls.length);
        await Promise.allSettled(
          Array.from({ length: workerCount }, () => worker())
        );
      }

      // Finish job
      if (!abortRef.current?.signal.aborted) {
        const [completedResult, failedResult, skippedResult, totalResult, resultCountResult] = await Promise.all([
          supabase.from('scrape_urls').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'completed'),
          supabase.from('scrape_urls').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'failed'),
          supabase.from('scrape_urls').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'skipped'),
          supabase.from('scrape_urls').select('*', { count: 'exact', head: true }).eq('job_id', jobId),
          supabase.from('scrape_results').select('*', { count: 'exact', head: true }).eq('job_id', jobId),
        ]);

        await supabase.from('scrape_jobs').update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          total_urls: totalResult.count || 0,
          completed_urls: (completedResult.count || 0) + (skippedResult.count || 0),
          failed_urls: failedResult.count || 0,
          total_results: resultCountResult.count || 0,
        }).eq('id', jobId);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Erreur orchestration:', err);
        await supabase.from('scrape_jobs').update({
          status: 'failed',
          error_message: (err as Error)?.message || 'Erreur orchestration',
          finished_at: new Date().toISOString(),
        }).eq('id', jobId);
      }
    } finally {
      setIsRunning(false);
      setCurrentUrls([]);
      setProcessedCount(0);
    }
  }, [supabase]);

  const start = useCallback((config: OrchestratorConfig) => {
    processJob(config, false);
  }, [processJob]);

  const pause = useCallback(async (jobId: string) => {
    pausedRef.current = true;
    setIsPaused(true);
    await supabase.from('scrape_jobs').update({ status: 'paused' }).eq('id', jobId);
  }, [supabase]);

  const resume = useCallback((config: OrchestratorConfig) => {
    if (isRunning) {
      // Loop is still running, just unpause
      pausedRef.current = false;
      setIsPaused(false);
      supabase.from('scrape_jobs').update({ status: 'running' }).eq('id', config.jobId);
    } else {
      // Loop was lost (page navigated away), restart from pending URLs
      processJob(config, true);
    }
  }, [isRunning, processJob, supabase]);

  const cancel = useCallback(async (jobId: string) => {
    abortRef.current?.abort();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentUrls([]);
    setProcessedCount(0);
    await supabase.from('scrape_jobs').update({
      status: 'cancelled',
      finished_at: new Date().toISOString(),
    }).eq('id', jobId);
  }, [supabase]);

  return { isRunning, isPaused, currentUrls, processedCount, start, pause, resume, cancel };
}
