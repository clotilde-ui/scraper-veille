'use client';

import { useState } from 'react';
import { ArrowUpDown, Trash2 } from 'lucide-react';
import { JobStatusBadge } from './ScraperStatusBadge';
import { SCRAPE_TYPES } from '@/types';
import type { DbScrapeJobWithCreator } from '@/types/supabase';

type SortField = 'name' | 'status' | 'scrape_type' | 'total_urls' | 'total_results' | 'created_at';
type SortDir = 'asc' | 'desc';

interface ScraperJobListProps {
  jobs: DbScrapeJobWithCreator[];
  onSelect: (job: DbScrapeJobWithCreator) => void;
  onDelete: (job: DbScrapeJobWithCreator) => void;
}

export function ScraperJobList({ jobs, onSelect, onDelete }: ScraperJobListProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = [...jobs].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'status': cmp = a.status.localeCompare(b.status); break;
      case 'scrape_type': cmp = a.scrape_type.localeCompare(b.scrape_type); break;
      case 'total_urls': cmp = a.total_urls - b.total_urls; break;
      case 'total_results': cmp = a.total_results - b.total_results; break;
      case 'created_at': cmp = a.created_at.localeCompare(b.created_at); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-blue-500' : 'opacity-40'}`} />
      </span>
    </th>
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="overflow-x-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
      <table className="w-full">
        <thead className="border-b border-slate-200 dark:border-slate-700">
          <tr>
            <SortHeader field="name" label="Nom" />
            <SortHeader field="status" label="Statut" />
            <SortHeader field="scrape_type" label="Type" />
            <SortHeader field="total_urls" label="URLs" />
            <SortHeader field="total_results" label="Résultats" />
            <SortHeader field="created_at" label="Date" />
            <th className="px-4 py-3 w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map(job => {
            const typeConfig = SCRAPE_TYPES.find(t => t.value === job.scrape_type);
            const progress = job.total_urls > 0
              ? Math.round(((job.completed_urls + job.failed_urls) / job.total_urls) * 100)
              : 0;

            return (
              <tr
                key={job.id}
                onClick={() => onSelect(job)}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white text-sm">{job.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {job.users ? `${job.users.first_name} ${job.users.last_name}` : '—'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <JobStatusBadge status={job.status as 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'} />
                    {(job.status === 'running' || job.status === 'paused') && (
                      <div className="w-20 bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {typeConfig && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeConfig.color} ${typeConfig.bgColor}`}>
                      {typeConfig.label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {job.completed_urls}/{job.total_urls}
                  {job.failed_urls > 0 && <span className="text-red-500 ml-1">(+{job.failed_urls} err)</span>}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{job.total_results}</td>
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{formatDate(job.created_at)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(job); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                Aucun job de scraping
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
