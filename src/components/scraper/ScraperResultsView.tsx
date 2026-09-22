'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ExternalLink, Copy, Check, Table2, Sparkles, ArrowDown, ArrowUp, Settings2, Filter } from 'lucide-react';
import { ResultTypeBadge } from './ScraperStatusBadge';
import { ScraperAiPromptModal } from './ScraperAiPromptModal';
import { Pagination } from '@/components/Pagination';
import { SCRAPE_RESULT_TYPES } from '@/types';
import type { ScrapeResultRow } from '@/hooks/useSupabaseScrapeResults';
import type { ScrapeResultType } from '@/types';

const MIN_COL_WIDTH = 80;
const CHECKBOX_COL_WIDTH = 40;
const ACTIONS_COL_WIDTH = 80;

const DEFAULT_COL_WIDTHS = {
  site: 256,
  type: 112,
  valeur: 320,
  label: 192,
  contexte: 384,
  score: 140,
};

type ColKey = keyof typeof DEFAULT_COL_WIDTHS;
type SortColumn = 'site' | 'type' | 'valeur' | 'label' | 'contexte' | 'score';

interface ColumnFilters {
  site: string;
  valeur: string;
  label: string;
  contexte: string;
  score: 'all' | 'high' | 'mid' | 'low' | 'none';
}

const EMPTY_FILTERS: ColumnFilters = { site: '', valeur: '', label: '', contexte: '', score: 'all' };

interface ScraperResultsViewProps {
  results: ScrapeResultRow[];
  isLoading: boolean;
  jobId?: string;
  webhookUrl?: string;
  onSendToSheets?: () => void;
  sheetsSending?: boolean;
  sheetsSendStatus?: 'idle' | 'success' | 'error';
  onScore?: (resultIds?: string[]) => void;
  scoring?: boolean;
  scoreRemaining?: number | null;
  scoreError?: string | null;
  aiPrompt?: string | null;
  onPromptSaved?: (newPrompt: string | null) => void;
}

export function ScraperResultsView({ results, isLoading, jobId, webhookUrl, onSendToSheets, sheetsSending, sheetsSendStatus, onScore, scoring, scoreRemaining, scoreError, aiPrompt, onPromptSaved }: ScraperResultsViewProps) {
  const [activeTab, setActiveTab] = useState<ScrapeResultType | 'all'>('all');
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [expandedContextIds, setExpandedContextIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(EMPTY_FILTERS);
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(DEFAULT_COL_WIDTHS);
  const resizingRef = useRef<{ key: ColKey; startX: number; startWidth: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const handleResizeStart = useCallback((key: ColKey, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startWidth: colWidths[key] };

    const handleMove = (moveEvent: MouseEvent) => {
      const r = resizingRef.current;
      if (!r) return;
      const newWidth = Math.max(MIN_COL_WIDTH, r.startWidth + (moveEvent.clientX - r.startX));
      setColWidths(prev => ({ ...prev, [r.key]: newWidth }));
    };

    const handleEnd = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [colWidths]);

  const renderResizeHandle = (key: ColKey) => (
    <div
      onMouseDown={e => handleResizeStart(key, e)}
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-blue-400/50 active:bg-blue-500"
    />
  );

  const toggleContext = (id: string) => {
    setExpandedContextIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() =>
    activeTab === 'all' ? results : results.filter(r => r.result_type === activeTab),
    [results, activeTab]
  );

  const hasActiveColumnFilters = columnFilters.site !== '' || columnFilters.valeur !== ''
    || columnFilters.label !== '' || columnFilters.contexte !== '' || columnFilters.score !== 'all';

  const filteredByColumns = useMemo(() => {
    if (!hasActiveColumnFilters) return filtered;
    const matches = (haystack: string | null | undefined, needle: string) =>
      !needle || (haystack || '').toLowerCase().includes(needle.toLowerCase());
    return filtered.filter(r => {
      if (!matches(r.source_url, columnFilters.site)) return false;
      if (!matches(r.value, columnFilters.valeur)) return false;
      if (!matches(r.label, columnFilters.label)) return false;
      if (!matches(r.context, columnFilters.contexte)) return false;
      if (columnFilters.score !== 'all') {
        const s = r.ai_score;
        if (columnFilters.score === 'high' && !(s != null && s >= 7)) return false;
        if (columnFilters.score === 'mid' && !(s != null && s >= 4 && s < 7)) return false;
        if (columnFilters.score === 'low' && !(s != null && s >= 0 && s < 4)) return false;
        if (columnFilters.score === 'none' && s != null) return false;
      }
      return true;
    });
  }, [filtered, columnFilters, hasActiveColumnFilters]);

  const formatSourceUrl = (sourceUrl: string) => {
    try {
      const parsed = new URL(sourceUrl);
      return parsed.hostname + parsed.pathname;
    } catch {
      return sourceUrl;
    }
  };

  const getSortValue = (r: ScrapeResultRow, col: SortColumn): string => {
    switch (col) {
      case 'site': return r.source_url ? formatSourceUrl(r.source_url) : '';
      case 'type': return r.result_type;
      case 'valeur': return r.value ?? '';
      case 'label': return r.label ?? '';
      case 'contexte': return r.context ?? '';
      default: return '';
    }
  };

  const sorted = useMemo(() => {
    if (!sortColumn) return filteredByColumns;
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filteredByColumns].sort((a, b) => {
      if (sortColumn === 'score') {
        const rank = (v: number | null | undefined) => (v == null || v < 0 ? -1 : v);
        return (rank(a.ai_score) - rank(b.ai_score)) * dir;
      }
      return getSortValue(a, sortColumn).localeCompare(getSortValue(b, sortColumn), 'fr', { sensitivity: 'base' }) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredByColumns, sortColumn, sortDirection]);

  const handleSortClick = (col: SortColumn) => {
    if (sortColumn !== col) {
      setSortColumn(col);
      setSortDirection('desc');
    } else if (sortDirection === 'desc') {
      setSortDirection('asc');
    } else {
      setSortColumn(null);
      setSortDirection('desc');
    }
  };

  const hasKeywordResults = useMemo(() => results.some(r => r.result_type === 'keyword_match'), [results]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Masque la colonne Label quand aucun résultat n'en a (ex: scraping 100% mots-clés)
  const hasLabels = useMemo(() => results.some(r => r.label && String(r.label).trim() !== ''), [results]);

  // Largeur totale du tableau = somme des colonnes affichées, pour permettre
  // un defilement horizontal quand elle depasse le conteneur (au lieu de
  // comprimer les colonnes pour tenir dans 100%).
  const totalTableWidth = useMemo(() => {
    const columnsWidth = colWidths.site + colWidths.type + colWidths.valeur
      + (hasLabels ? colWidths.label : 0) + colWidths.contexte + colWidths.score;
    return CHECKBOX_COL_WIDTH + columnsWidth + ACTIONS_COL_WIDTH;
  }, [colWidths, hasLabels]);

  // Pagination
  const paginated = useMemo(() =>
    itemsPerPage === 0
      ? sorted
      : sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sorted, currentPage, itemsPerPage]
  );

  const selectableOnPage = useMemo(() =>
    paginated.filter(r => r.result_type === 'keyword_match').map(r => r.id),
    [paginated]
  );

  const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every(id => selectedIds.has(id));
  const someOnPageSelected = selectableOnPage.some(id => selectedIds.has(id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allOnPageSelected && someOnPageSelected;
    }
  }, [allOnPageSelected, someOnPageSelected]);

  const updateColumnFilter = <K extends keyof ColumnFilters>(key: K, value: ColumnFilters[K]) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        selectableOnPage.forEach(id => next.delete(id));
      } else {
        selectableOnPage.forEach(id => next.add(id));
      }
      return next;
    });
  };

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

  const renderSortButton = (col: SortColumn, label: string, title?: string) => (
    <button
      onClick={() => handleSortClick(col)}
      className="inline-flex items-center gap-1 uppercase hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      title={title || `Trier par ${label}`}
    >
      {label}
      {sortColumn === col && sortDirection === 'desc' && <ArrowDown className="w-3 h-3" />}
      {sortColumn === col && sortDirection === 'asc' && <ArrowUp className="w-3 h-3" />}
    </button>
  );

  const renderScore = (result: ScrapeResultRow) => {
    if (result.result_type !== 'keyword_match') return <span className="text-sm text-slate-300 dark:text-slate-600">—</span>;
    const s = result.ai_score;
    if (s === null || s === undefined) return <span className="text-xs text-slate-400">non analysé</span>;
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
        {hasActiveColumnFilters && (
          <button
            onClick={() => { setColumnFilters(EMPTY_FILTERS); setCurrentPage(1); }}
            className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        )}
        <button
          onClick={() => setShowFilters(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            showFilters || hasActiveColumnFilters
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtres
        </button>
        {onScore && hasKeywordResults && (
          <>
            {scoreError && <span className="text-xs text-red-500" title={scoreError}>Erreur analyse IA</span>}
            {jobId && (
              <button
                onClick={() => setPromptModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Personnaliser les instructions d'analyse IA pour ce job"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Prompt IA
              </button>
            )}
            {selectedIds.size > 0 && (
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
              >
                Tout désélectionner
              </button>
            )}
            <button
              onClick={() => onScore(selectedIds.size > 0 ? Array.from(selectedIds) : undefined)}
              disabled={scoring}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Noter de 0 à 10 avec l'IA la pertinence des correspondances de mots-clés"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {scoring
                ? (scoreRemaining != null ? `Analyse… (${scoreRemaining})` : 'Analyse…')
                : selectedIds.size > 0
                  ? `Analyser la sélection (${selectedIds.size})`
                  : "Analyser avec l'IA"}
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
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
        <table className="table-fixed" style={{ width: totalTableWidth, minWidth: '100%' }}>
          <thead className="border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-2 w-10">
                {hasKeywordResults && (
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    disabled={selectableOnPage.length === 0}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    title="Sélectionner toutes les correspondances de mots-clés de cette page"
                  />
                )}
              </th>
              <th style={{ width: colWidths.site }} className="relative px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {renderSortButton('site', 'Site scrapé')}
                {renderResizeHandle('site')}
              </th>
              <th style={{ width: colWidths.type }} className="relative px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {renderSortButton('type', 'Type')}
                {renderResizeHandle('type')}
              </th>
              <th style={{ width: colWidths.valeur }} className="relative px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {renderSortButton('valeur', 'Valeur')}
                {renderResizeHandle('valeur')}
              </th>
              {hasLabels && (
                <th style={{ width: colWidths.label }} className="relative px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                  {renderSortButton('label', 'Label')}
                  {renderResizeHandle('label')}
                </th>
              )}
              <th style={{ width: colWidths.contexte }} className="relative px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {renderSortButton('contexte', 'Contexte')}
                {renderResizeHandle('contexte')}
              </th>
              <th style={{ width: colWidths.score }} className="relative px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {renderSortButton('score', 'Score', "Trier par note IA")}
                {renderResizeHandle('score')}
              </th>
              <th className="px-4 py-2 w-20" />
            </tr>
            {showFilters && (
              <tr className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                <th className="px-4 py-2" />
                <th className="px-4 py-2">
                  <input
                    type="text"
                    value={columnFilters.site}
                    onChange={e => updateColumnFilter('site', e.target.value)}
                    placeholder="Filtrer..."
                    className="w-full px-2 py-1 text-xs font-normal normal-case border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </th>
                <th className="px-4 py-2" />
                <th className="px-4 py-2">
                  <input
                    type="text"
                    value={columnFilters.valeur}
                    onChange={e => updateColumnFilter('valeur', e.target.value)}
                    placeholder="Filtrer..."
                    className="w-full px-2 py-1 text-xs font-normal normal-case border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </th>
                {hasLabels && (
                  <th className="px-4 py-2">
                    <input
                      type="text"
                      value={columnFilters.label}
                      onChange={e => updateColumnFilter('label', e.target.value)}
                      placeholder="Filtrer..."
                      className="w-full px-2 py-1 text-xs font-normal normal-case border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </th>
                )}
                <th className="px-4 py-2">
                  <input
                    type="text"
                    value={columnFilters.contexte}
                    onChange={e => updateColumnFilter('contexte', e.target.value)}
                    placeholder="Filtrer..."
                    className="w-full px-2 py-1 text-xs font-normal normal-case border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </th>
                <th className="px-4 py-2">
                  {hasKeywordResults && (
                    <select
                      value={columnFilters.score}
                      onChange={e => updateColumnFilter('score', e.target.value as ColumnFilters['score'])}
                      className="w-full px-2 py-1 text-xs font-normal normal-case border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Tout</option>
                      <option value="high">≥7 Pertinent</option>
                      <option value="mid">4-6 Incertain</option>
                      <option value="low">0-3 Faux positif</option>
                      <option value="none">Non analysé</option>
                    </select>
                  )}
                </th>
                <th className="px-4 py-2" />
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginated.map(result => (
              <tr key={result.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-2 align-top">
                  {result.result_type === 'keyword_match' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(result.id)}
                      onChange={() => toggleSelect(result.id)}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                  )}
                </td>
                <td className="px-4 py-2 align-top">
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
                <td className="px-4 py-2 align-top">
                  <ResultTypeBadge type={result.result_type as ScrapeResultType} />
                </td>
                <td className="px-4 py-2 align-top">
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
                {hasLabels && (
                  <td className="px-4 py-2 align-top text-sm text-slate-500 dark:text-slate-400 truncate max-w-[12rem]">
                    {result.label || '—'}
                  </td>
                )}
                <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 max-w-md align-top">
                  {result.context ? (
                    <>
                      <span className={`whitespace-pre-wrap ${expandedContextIds.has(result.id) ? '' : 'line-clamp-3'}`}>
                        {result.context}
                      </span>
                      <button
                        onClick={() => toggleContext(result.id)}
                        className="block mt-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        {expandedContextIds.has(result.id) ? 'Voir moins' : 'Voir tout'}
                      </button>
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-2 align-top">
                  {renderScore(result)}
                </td>
                <td className="px-4 py-2 align-top">
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
            {sorted.length === 0 && (
              <tr>
                <td colSpan={hasLabels ? 8 : 7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                  {hasActiveColumnFilters
                    ? 'Aucun résultat ne correspond aux filtres'
                    : `Aucun résultat${activeTab !== 'all' ? ' pour ce type' : ''}`}
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

      {jobId && promptModalOpen && (
        <ScraperAiPromptModal
          isOpen={promptModalOpen}
          onClose={() => setPromptModalOpen(false)}
          jobId={jobId}
          initialPrompt={aiPrompt ?? null}
          onSaved={newPrompt => onPromptSaved?.(newPrompt)}
        />
      )}
    </div>
  );
}
