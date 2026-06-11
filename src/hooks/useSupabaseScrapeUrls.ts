'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ScrapeUrlRow {
  id: string;
  job_id: string;
  url: string;
  status: string;
  depth: number;
  parent_url_id: string | null;
  http_status: number | null;
  error_message: string | null;
  page_title: string | null;
  scraped_at: string | null;
  created_at: string;
}

export function useSupabaseScrapeUrls(jobId: string) {
  const [urls, setUrls] = useState<ScrapeUrlRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchUrls = useCallback(async (showLoading = true) => {
    if (!jobId) return;
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/scraper/urls?jobId=${encodeURIComponent(jobId)}`);
      if (!mountedRef.current) return;

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur de chargement');
      } else {
        const data: ScrapeUrlRow[] = await res.json();
        setUrls(data);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchUrls();
    return () => { mountedRef.current = false; };
  }, [fetchUrls]);

  const insertUrls = async (urlsData: Omit<ScrapeUrlRow, 'created_at'>[]) => {
    if (urlsData.length === 0) return [];
    try {
      const res = await fetch('/api/scraper/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urlsData),
      });

      if (!res.ok) {
        setError('Erreur lors de l\'insertion des URLs');
        return [];
      }

      const data: ScrapeUrlRow[] = await res.json();
      return data;
    } catch {
      return [];
    }
  };

  const updateUrl = async (urlId: string, data: Partial<ScrapeUrlRow>) => {
    try {
      await fetch(`/api/scraper/urls/${urlId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch { /* fire-and-forget */ }
  };

  return { urls, isLoading, error, fetchUrls, insertUrls, updateUrl };
}
