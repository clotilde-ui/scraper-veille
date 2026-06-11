'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { DbScrapeResult } from '@/types/supabase';

const FETCH_TIMEOUT = 8000;

const withTimeout = <T,>(promiseLike: PromiseLike<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([Promise.resolve(promiseLike), timeout]);
};

export function useSupabaseScrapeResults(jobId: string, filterType?: string) {
  const [results, setResults] = useState<DbScrapeResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const supabase = getSupabaseClient();

  const fetchResults = useCallback(async (showLoading = true) => {
    if (!jobId) return;
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('scrape_results')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (filterType) {
        query = query.eq('result_type', filterType);
      }

      const result = await withTimeout(
        query.limit(500),
        FETCH_TIMEOUT
      ) as { data: DbScrapeResult[] | null; error: { message: string } | null };

      if (!mountedRef.current) return;
      if (result.error) { setError(result.error.message); }
      else { setResults(result.data || []); }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Erreur';
      setError(msg === 'Timeout' ? 'Délai dépassé' : msg);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [supabase, jobId, filterType]);

  useEffect(() => {
    mountedRef.current = true;
    fetchResults();
    return () => { mountedRef.current = false; };
  }, [fetchResults]);

  // Realtime
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`scrape-results-${jobId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scrape_results', filter: `job_id=eq.${jobId}` }, () => {
        fetchResults(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, jobId, fetchResults]);

  return { results, isLoading, error, fetchResults };
}
