'use client';

import { Pause, Play, X, Loader2, Globe, Zap } from 'lucide-react';
import { JobStatusBadge } from './ScraperStatusBadge';
import type { DbScrapeJobWithCreator } from '@/types/supabase';
import type { ScrapeJobStatus } from '@/types';

interface ScraperProgressPanelProps {
  job: DbScrapeJobWithCreator;
  currentUrls: string[];
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function ScraperProgressPanel({
  job,
  currentUrls,
  isPaused,
  onPause,
  onResume,
  onCancel,
}: ScraperProgressPanelProps) {
  const processed = job.completed_urls + job.failed_urls;
  const progress = job.total_urls > 0 ? Math.round((processed / job.total_urls) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className={`w-5 h-5 text-blue-500 ${isPaused ? '' : 'animate-spin'}`} />
          <h3 className="font-semibold text-slate-900 dark:text-white">Scraping en cours</h3>
          <JobStatusBadge status={job.status as ScrapeJobStatus} />
          {currentUrls.length > 1 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
              <Zap className="w-3 h-3" />
              {currentUrls.length}x parallèle
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPaused ? (
            <button
              onClick={onResume}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Reprendre
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          )}
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Annuler
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>{processed} / {job.total_urls} URLs traitées</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${isPaused ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-emerald-600 dark:text-emerald-400">
          {job.completed_urls} OK
        </span>
        {job.failed_urls > 0 && (
          <span className="text-red-500">
            {job.failed_urls} échoué{job.failed_urls > 1 ? 's' : ''}
          </span>
        )}
        <span className="text-blue-600 dark:text-blue-400">
          {job.total_results} résultat{job.total_results !== 1 ? 's' : ''} trouvé{job.total_results !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Current URLs */}
      {currentUrls.length > 0 && !isPaused && (
        <div className="mt-3 space-y-1">
          {currentUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-1.5">
              <Globe className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-blue-500" />
              <span className="truncate font-mono">{url}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
