'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
        const data: ScrapeJobRow[] = await res.json();
        setJobs(data);
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

  const addJob = async (data: Omit<ScrapeJobRow, 'id' | 'created_at' | 'updated_at'>) => {
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

      const created: ScrapeJobRow = await res.json();
      fetchJobs(false);
      return created;
    } catch (err) {
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

      const updated: ScrapeJobRow = await res.json();
      fetchJobs(false);
      return updated;
    } catch (err) {
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
    } catch (err) {
      setError('Erreur lors de la suppression');
      return false;
    }
  };

  return { jobs, isLoading, error, fetchJobs, addJob, updateJob, deleteJob, retry };
}
