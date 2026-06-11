'use client';

import { Clock, Globe, FileText, AlertTriangle, Play, Trash2 } from 'lucide-react';
import { JobStatusBadge } from './ScraperStatusBadge';
import { SCRAPE_TYPES } from '@/types';
import type { ScrapeJobRow } from '@/hooks/useSupabaseScrapeJobs';

interface ScraperJobCardProps {
  job: ScrapeJobRow;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function ScraperJobCard({ job, onClick, onDelete }: ScraperJobCardProps) {
  const scrapeTypeConfig = SCRAPE_TYPES.find(t => t.value === job.scrape_type);
  const progress = job.total_urls > 0
    ? Math.round(((job.completed_urls + job.failed_urls) / job.total_urls) * 100)
    : 0;
  const isActive = job.status === 'running' || job.status === 'paused';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{job.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {job.users ? `${job.users.first_name} ${job.users.last_name}` : '—'} · {formatDate(job.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <JobStatusBadge status={job.status as 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'} />
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Type + Profondeur */}
      <div className="flex items-center gap-3 mb-3 text-sm text-slate-600 dark:text-slate-400">
        {scrapeTypeConfig && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${scrapeTypeConfig.color} ${scrapeTypeConfig.bgColor}`}>
            {scrapeTypeConfig.label}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Globe className="w-3.5 h-3.5" />
          Profondeur {job.crawl_depth}
        </span>
        {job.keywords && job.keywords.length > 0 && (
          <span className="flex items-center gap-1 text-xs">
            <FileText className="w-3.5 h-3.5" />
            {job.keywords.length} mot{job.keywords.length > 1 ? 's' : ''}-clé{job.keywords.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{job.completed_urls + job.failed_urls} / {job.total_urls} URLs</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Globe className="w-3.5 h-3.5" />
          {job.total_urls} URL{job.total_urls !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          {job.total_results} résultat{job.total_results !== 1 ? 's' : ''}
        </span>
        {job.failed_urls > 0 && (
          <span className="flex items-center gap-1 text-red-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            {job.failed_urls} échec{job.failed_urls !== 1 ? 's' : ''}
          </span>
        )}
        {job.status === 'completed' && job.finished_at && (
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(job.finished_at)}
          </span>
        )}
        {job.status === 'pending' && (
          <span className="flex items-center gap-1 ml-auto text-blue-500">
            <Play className="w-3.5 h-3.5" />
            Prêt à lancer
          </span>
        )}
      </div>
    </div>
  );
}
