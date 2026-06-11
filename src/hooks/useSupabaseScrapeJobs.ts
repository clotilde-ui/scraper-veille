'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Type mirrors what components expect (snake_case, matching old Supabase DB types)
export interface ScrapeJobRow {
  id: string;
  name: string;
  status: string;
  scrape_type: string;
  crawl_depth: number;
  keywords: string[] | null;
  total_urls: number;
  completed_urls: number;
  failed_urls: number;
  total_results: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  // Compat with old DbScrapeJobWithCreator usage
  users?: null;
}

// Normalize camelCase Drizzle response to snake_case for component compatibility
function normalize(row: Record<string, unknown>): ScrapeJobRow {
  return {
    id: row.id as string,
    name: row.name as string,
    status: (row.status ?? 'pending') as string,
    scrape_type: (row.scrapeType ?? row.scrape_type ?? 'links') as string,
    crawl_depth: (row.crawlDepth ?? row.crawl_depth ?? 1) as number,
    keywords: row.keywords as string[] | null,
    total_urls: (row.totalUrls ?? row.total_urls ?? 0) as number,
    completed_urls: (row.completedUrls ?? row.completed_urls ?? 0) as number,
    failed_urls: (row.failedUrls ?? row.failed_urls ?? 0) as number,
    total_results: (row.totalResults ?? row.total_results ?? 0) as number,
    error_message: (row.errorMessage ?? row.error_message ?? null) as string | null,
    started_at: (row.startedAt ?? row.started_at ?? null) as string | null,
    finished_at: (row.finishedAt ?? row.finished_at ?? null) as string | null,
    created_at: (row.createdAt ?? row.created_at ?? '') as string,
    updated_at: (row.updatedAt ?? row.updated_at ?? '') as string,
    users: null,
  };
}

export function useSupabaseScrapeJobs() {
  const [jobs, setJobs] = useState<ScrapeJobRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);
  const pendingRefetchRef = useRef(false);

  const fetchJobs = useCallback(async (showLoading = true) => {
    if (fetchInProgressRef.current) {
      pendingRefetchRef.current = true;
      return;
    }
    fetchInProgressRef.current = true;

    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/scraper/jobs');
      if (!mountedRef.current) return;

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur de chargement');
      } else {
        const data: Record<string, unknown>[] = await res.json();
        setJobs(data.map(normalize));
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      if (mountedRef.current) setIsLoading(false);
      fetchInProgressRef.current = false;
      if (pendingRefetchRef.current && mountedRef.current) {
        pendingRefetchRef.current = false;
        fetchJobs(false);
      }
    }
  }, []);

  const retry = useCallback(() => fetchJobs(true), [fetchJobs]);

  useEffect(() => {
    mountedRef.current = true;
    fetchJobs();
    return () => { mountedRef.current = false; };
  }, [fetchJobs]);

  const addJob = async (data: Omit<ScrapeJobRow, 'id' | 'created_at' | 'updated_at' | 'users'>) => {
    setError(null);
    try {
      const res = await fetch('/api/scraper/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Erreur lors de la création');
        return null;
      }

      const created = await res.json();
      fetchJobs(false);
      return normalize(created);
    } catch {
      setError('Erreur lors de la création');
      return null;
    }
  };

  const updateJob = async (id: string, data: Partial<ScrapeJobRow>) => {
    setError(null);
    try {
      const res = await fetch(`/api/scraper/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Erreur lors de la mise à jour');
        return null;
      }

      const updated = await res.json();
      fetchJobs(false);
      return normalize(updated);
    } catch {
      setError('Erreur lors de la mise à jour');
      return null;
    }
  };

  const deleteJob = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/scraper/jobs/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Erreur lors de la suppression');
        return false;
      }

      fetchJobs(false);
      return true;
    } catch {
      setError('Erreur lors de la suppression');
      return false;
    }
  };

  return { jobs, isLoading, error, fetchJobs, addJob, updateJob, deleteJob, retry };
}
