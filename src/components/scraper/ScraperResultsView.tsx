'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, Copy, Check, Table2, Sparkles, ArrowDown, ArrowUp } from 'lucide-react';
import { ResultTypeBadge } from './ScraperStatusBadge';
import { Pagination } from '@/components/Pagination';
import { SCRAPE_RESULT_TYPES } from '@/types';
import type { ScrapeResultRow } from '@/hooks/useSupabaseScrapeResults';
import type { ScrapeResultType } from '@/types';

interface ScraperResultsViewProps {
  results: ScrapeResultRow[];
  isLoading: boolean;
  jobId?: string;
  webhookUrl?: string;
  onSendToSheets?: () => void;
  sheetsSending?: boolean;
  sheetsSendStatus?: 'idle' | 'success' | 'error';
  onScore?: () => void;
  scoring?: boolean;
  scoreRemaining?: number | null;
  scoreError?: string | null;
}

export function ScraperResultsView({ results, isLoading, webhookUrl, onSendToSheets, sheetsSending, sheetsSendStatus, onScore, scoring, scoreRemaining, scoreError }: ScraperResultsViewProps) {
  const [activeTab, setActiveTab] = useState<ScrapeResultType | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortScore, setSortScore] = useState<'none' | 'desc' | 'asc'>('none');

  const filtered = useMemo(() =>
    activeTab === 'all' ? results : results.filter(r => r.result_type === activeTab),
    [results, activeTab]
  );

  const sorted = useMemo(() => {
    if (sortScore === 'none') return filtered;
    const rank = (v: number | null) => (v === null || v < 0 ? -1 : v);
    return [...filtered].sort((a, b) =>
      sortScore === 'desc' ? rank(b.ai_score) - rank(a.ai_score) : rank(a.ai_score) - rank(b.ai_score)
    );
  }, [filtered, sortScore]);

  const hasKeywordResults = useMemo(() => results.some(r => r.result_type === 'keyword_match'), [results]);

  // Pagination
  const paginated = useMemo(() =>
    itemsPerPage === 0
      ? sorted
      : sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sorted, currentPage, itemsPerPage]
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

  const formatSourceUrl = (sourceUrl: string) => {
    try {
      const parsed = new URL(sourceUrl);
      return parsed.hostname + parsed.pathname;
    } catch {
      return sourceUrl;
    }
  };

  const copyValue = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleTabChange = (tab: ScrapeResultType | 'all') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const renderScore = (result: ScrapeResultRow) => {
    if (result.result_type !== 'keyword_match') return <span className="text-sm text-slate-300 dark:text-slate-600">—</span>;
    const s = result.ai_score;
    if (s === null || s === undefined) return <span className="text-xs text-slate-400">non noté</span>;
    if (s < 0) return <span className="text-xs text-slate-400" title="Non évalué par l'IA">—</span>;
    const color = s >= 7
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : s >= 4
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    return <span className={`inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-md text-sm font-semibold ${color}`}>{s}</span>;
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
      {/* Tabs + Google Sheets button */}
      <div className="flex items-center gap-2 flex-wrap justify-between">
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
      <div className="flex items-center gap-2 flex-shrink-0">
        {onScore && hasKeywordResults && (
          <>
            {scoreError && <span className="text-xs text-red-500" title={scoreError}>Erreur scoring</span>}
            <button
              onClick={onScore}
              disabled={scoring}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Noter chaque correspondance de mots-clés de 0 à 10 avec l'IA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {scoring
                ? (scoreRemaining != null ? `Analyse… (${scoreRemaining})` : 'Analyse…')
                : 'Analyser avec l\'IA'}
            </button>
          </>
        )}
        {webhookUrl && onSendToSheets && (
          <>
            {sheetsSendStatus === 'success' && <span className="text-xs text-emerald-600 dark:text-emerald-400">Envoyé !</span>}
            {sheetsSendStatus === 'error' && <span className="text-xs text-red-500">Erreur webhook</span>}
            <button
              onClick={onSendToSheets}
              disabled={sheetsSending || results.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Table2 className="w-3.5 h-3.5" />
              {sheetsSending ? 'Envoi...' : 'Sheets'}
            </button>
          </>
        )}
      </div>
      </div>

      {/* Results list */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-64">Site scrapé</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-28">Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Valeur</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-48">Label</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-64">Contexte</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-24">
                <button
                  onClick={() => setSortScore(prev => prev === 'desc' ? 'asc' : prev === 'asc' ? 'none' : 'desc')}
                  className="inline-flex items-center gap-1 uppercase hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="Trier par score"
                >
                  Score IA
                  {sortScore === 'desc' && <ArrowDown className="w-3 h-3" />}
                  {sortScore === 'asc' && <ArrowUp className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-4 py-2 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map(result => (
              <tr key={result.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-2">
                  {result.source_url ? (
                    <a
                      href={result.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline max-w-[16rem]"
                      title={result.source_url}
                    >
                      <span className="truncate">{formatSourceUrl(result.source_url)}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
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
                <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 truncate max-w-[12rem]">
                  {result.label || '—'}
                </td>
                <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[16rem]">
                  {result.context || '—'}
                </td>
                <td className="px-4 py-2">
                  {renderScore(result)}
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
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
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
