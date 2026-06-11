'use client';

import { SCRAPE_JOB_STATUSES, SCRAPE_RESULT_TYPES } from '@/types';
import type { ScrapeJobStatus, ScrapeUrlStatus, ScrapeResultType } from '@/types';

const URL_STATUS_CONFIG: Record<ScrapeUrlStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-700' },
  scraping: { label: 'Scraping...', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  completed: { label: 'OK', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  failed: { label: 'Échoué', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  skipped: { label: 'Ignoré', color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-700' },
};

export function JobStatusBadge({ status }: { status: ScrapeJobStatus }) {
  const config = SCRAPE_JOB_STATUSES.find(s => s.value === status);
  if (!config) return null;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      {status === 'running' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />}
      {config.label}
    </span>
  );
}

export function UrlStatusBadge({ status }: { status: ScrapeUrlStatus }) {
  const config = URL_STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      {status === 'scraping' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1 animate-pulse" />}
      {config.label}
    </span>
  );
}

export function ResultTypeBadge({ type }: { type: ScrapeResultType }) {
  const config = SCRAPE_RESULT_TYPES.find(t => t.value === type);
  if (!config) return null;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      {config.label}
    </span>
  );
}
