'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { ResultTypeBadge } from './ScraperStatusBadge';
import { Pagination } from '@/components/Pagination';
import { SCRAPE_RESULT_TYPES } from '@/types';
import type { DbScrapeResult } from '@/types/supabase';
import type { ScrapeResultType } from '@/types';

interface ScraperResultsViewProps {
  results: DbScrapeResult[];
  isLoading: boolean;
}

export function ScraperResultsView({ results, isLoading }: ScraperResultsViewProps) {
  const [activeTab, setActiveTab] = useState<ScrapeResultType | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const filtered = useMemo(() =>
    activeTab === 'all' ? results : results.filter(r => r.result_type === activeTab),
    [results, activeTab]
  );

  // Pagination
  const paginated = useMemo(() =>
    itemsPerPage === 0
      ? filtered
      : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filtered, currentPage, itemsPerPage]
  );

  // Count par type
  const counts = useMemo(() =>
    SCRAPE_RESULT_TYPES.reduce<Record<string, number>>((acc, t) => {
      acc[t.value] = results.filter(r => r.result_type === t.value).length;
      return acc;
    }, {}),
    [results]
  );

  const activeTypes = SCRAPE_RESULT_TYPES.filter(t => counts[t.value] > 0);

  const copyValue = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleTabChange = (tab: ScrapeResultType | 'all') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        Chargement des résultats...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => handleTabChange('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Tout ({results.length})
        </button>
        {activeTypes.map(t => (
          <button
            key={t.value}
            onClick={() => handleTabChange(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.value
                ? 'bg-blue-500 text-white'
                : `${t.bgColor} ${t.color} hover:opacity-80`
            }`}
          >
            {t.label} ({counts[t.value]})
          </button>
        ))}
      </div>

      {/* Results list */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-28">Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Valeur</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-56">Source</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-48">Label</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-64">Contexte</th>
              <th className="px-4 py-2 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map(result => (
              <tr key={result.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-2">
                  <ResultTypeBadge type={result.result_type as ScrapeResultType} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 max-w-md">
                    <span className="text-sm text-slate-900 dark:text-white font-mono truncate">
                      {result.value}
                    </span>
                    {(result.result_type === 'link' || result.result_type === 'pdf' || result.result_type === 'download' || result.result_type === 'image') && (
                      <a
                        href={result.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-500 flex-shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {result.source_url ? (
                    <a
                      href={result.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline max-w-[14rem]"
                      title={result.source_url}
                    >
                      <span className="truncate">{new URL(result.source_url).hostname + new URL(result.source_url).pathname}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 truncate max-w-[12rem]">
                  {result.label || '—'}
                </td>
                <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[16rem]">
                  {result.context || '—'}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => copyValue(result.id, result.value)}
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Copier"
                  >
                    {copiedId === result.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                  Aucun résultat{activeTab !== 'all' ? ' pour ce type' : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
      />
    </div>
  );
}
