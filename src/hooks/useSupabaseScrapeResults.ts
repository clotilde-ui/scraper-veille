'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ScrapeResultRow {
  id: string;
  job_id: string;
  url_id: string;
  source_url: string | null;
  result_type: string;
  value: string;
  label: string | null;
  context: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useSupabaseScrapeResults(jobId: string, filterType?: string) {
  const [results, setResults] = useState<ScrapeResultRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchResults = useCallback(async (showLoading = true) => {
    if (!jobId) return;
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ jobId, limit: '500' });
      if (filterType) params.set('type', filterType);

      const res = await fetch(`/api/scraper/results?${params.toString()}`);
      if (!mountedRef.current) return;

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur de chargement');
      } else {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [jobId, filterType]);

  useEffect(() => {
    mountedRef.current = true;
    fetchResults();
    return () => { mountedRef.current = false; };
  }, [fetchResults]);

  return { results, isLoading, error, fetchResults };
}
