'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { DbScrapeUrl, DbScrapeUrlInsert } from '@/types/supabase';

const FETCH_TIMEOUT = 5000;

const withTimeout = <T,>(promiseLike: PromiseLike<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([Promise.resolve(promiseLike), timeout]);
};

export function useSupabaseScrapeUrls(jobId: string) {
  const [urls, setUrls] = useState<DbScrapeUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const supabase = getSupabaseClient();

  const fetchUrls = useCallback(async (showLoading = true) => {
    if (!jobId) return;
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const result = await withTimeout(
        supabase
          .from('scrape_urls')
          .select('*')
          .eq('job_id', jobId)
          .order('depth', { ascending: true })
          .order('created_at', { ascending: true }),
        FETCH_TIMEOUT
      ) as { data: DbScrapeUrl[] | null; error: { message: string } | null };

      if (!mountedRef.current) return;
      if (result.error) { setError(result.error.message); }
      else { setUrls(result.data || []); }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Erreur';
      setError(msg === 'Timeout' ? 'Délai dépassé' : msg);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [supabase, jobId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchUrls();
    return () => { mountedRef.current = false; };
  }, [fetchUrls]);

  // Realtime
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`scrape-urls-${jobId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scrape_urls', filter: `job_id=eq.${jobId}` }, () => {
        fetchUrls(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, jobId, fetchUrls]);

  const insertUrls = async (urlsData: DbScrapeUrlInsert[]) => {
    if (urlsData.length === 0) return [];
    try {
      const result = await withTimeout(
        supabase.from('scrape_urls').insert(urlsData).select(),
        FETCH_TIMEOUT
      ) as { data: DbScrapeUrl[] | null; error: { message: string } | null };

      if (result.error) { setError(result.error.message); return []; }
      return result.data || [];
    } catch {
      return [];
    }
  };

  const updateUrl = async (urlId: string, data: Partial<DbScrapeUrl>) => {
    try {
      await supabase.from('scrape_urls').update(data).eq('id', urlId);
    } catch { /* fire-and-forget, realtime will catch up */ }
  };

  return { urls, isLoading, error, fetchUrls, insertUrls, updateUrl };
}
