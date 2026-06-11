'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/activityLogger';
import type { DbScrapeJobInsert, DbScrapeJobUpdate, DbScrapeJobWithCreator } from '@/types/supabase';

const FETCH_TIMEOUT = 5000;

const withTimeout = <T,>(promiseLike: PromiseLike<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([Promise.resolve(promiseLike), timeout]);
};

export function useSupabaseScrapeJobs() {
  const [jobs, setJobs] = useState<DbScrapeJobWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);
  const pendingRefetchRef = useRef(false);

  const supabase = getSupabaseClient();

  const fetchJobs = useCallback(async (showLoading = true) => {
    if (fetchInProgressRef.current) {
      pendingRefetchRef.current = true;
      return;
    }
    fetchInProgressRef.current = true;

    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const result = await withTimeout(
        supabase
          .from('scrape_jobs')
          .select(`*, users:created_by (id, first_name, last_name, email)`)
          .order('created_at', { ascending: false }),
        FETCH_TIMEOUT
      ) as { data: DbScrapeJobWithCreator[] | null; error: { message: string } | null };

      if (!mountedRef.current) return;
      if (result.error) {
        setError(result.error.message);
      } else {
        setJobs(result.data as DbScrapeJobWithCreator[]);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(msg === 'Timeout' ? 'Délai de connexion dépassé' : msg);
    } finally {
      if (mountedRef.current) setIsLoading(false);
      fetchInProgressRef.current = false;
      if (pendingRefetchRef.current && mountedRef.current) {
        pendingRefetchRef.current = false;
        fetchJobs(false);
      }
    }
  }, [supabase]);

  const retry = useCallback(() => fetchJobs(true), [fetchJobs]);

  useEffect(() => {
    mountedRef.current = true;
    fetchJobs();
    return () => { mountedRef.current = false; };
  }, [fetchJobs]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('scrape-jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scrape_jobs' }, () => {
        fetchJobs(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchJobs]);

  const addJob = async (data: Omit<DbScrapeJobInsert, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    try {
      const result = await withTimeout(
        supabase.from('scrape_jobs').insert(data).select(`*, users:created_by (id, first_name, last_name, email)`).single(),
        FETCH_TIMEOUT
      ) as { data: DbScrapeJobWithCreator | null; error: { message: string } | null };

      if (result.error) { setError(result.error.message); return null; }
      logActivity({ userId: data.created_by || null, action: 'create', entityType: 'scrape_job', entityId: result.data?.id || null, newData: data as Record<string, unknown> });
      fetchJobs(false);
      return result.data;
    } catch (err) {
      setError("Erreur lors de la création");
      return null;
    }
  };

  const updateJob = async (id: string, data: DbScrapeJobUpdate) => {
    setError(null);
    try {
      const result = await withTimeout(
        supabase.from('scrape_jobs').update(data).eq('id', id).select(`*, users:created_by (id, first_name, last_name, email)`).single(),
        FETCH_TIMEOUT
      ) as { data: DbScrapeJobWithCreator | null; error: { message: string } | null };

      if (result.error) { setError(result.error.message); return null; }
      fetchJobs(false);
      return result.data;
    } catch (err) {
      setError('Erreur lors de la mise à jour');
      return null;
    }
  };

  const deleteJob = async (id: string) => {
    setError(null);
    try {
      const result = await withTimeout(
        supabase.from('scrape_jobs').delete().eq('id', id),
        FETCH_TIMEOUT
      ) as { error: { message: string } | null };

      if (result.error) { setError(result.error.message); return false; }
      logActivity({ userId: null, action: 'delete', entityType: 'scrape_job', entityId: id });
      fetchJobs(false);
      return true;
    } catch (err) {
      setError('Erreur lors de la suppression');
      return false;
    }
  };

  return { jobs, isLoading, error, fetchJobs, addJob, updateJob, deleteJob, retry };
}
