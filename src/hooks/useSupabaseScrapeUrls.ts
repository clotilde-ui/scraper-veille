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

function normalize(row: Record<string, unknown>): ScrapeUrlRow {
  return {
    id: row.id as string,
    job_id: (row.jobId ?? row.job_id) as string,
    url: row.url as string,
    status: row.status as string,
    depth: (row.depth ?? 0) as number,
    parent_url_id: (row.parentUrlId ?? row.parent_url_id ?? null) as string | null,
    http_status: (row.httpStatus ?? row.http_status ?? null) as number | null,
    error_message: (row.errorMessage ?? row.error_message ?? null) as string | null,
    page_title: (row.pageTitle ?? row.page_title ?? null) as string | null,
    scraped_at: (row.scrapedAt ?? row.scraped_at ?? null) as string | null,
    created_at: (row.createdAt ?? row.created_at ?? '') as string,
  };
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
        const data: Record<string, unknown>[] = await res.json();
        setUrls(data.map(normalize));
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

      const data: Record<string, unknown>[] = await res.json();
      return data.map(normalize);
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
