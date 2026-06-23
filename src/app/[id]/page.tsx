'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Globe, FileText, Link2, Download, Table2, Clock, Pencil } from 'lucide-react';
import { useSupabaseScrapeJobs, parseKeywords } from '@/hooks/useSupabaseScrapeJobs';
import { useSupabaseScrapeUrls } from '@/hooks/useSupabaseScrapeUrls';
import { useSupabaseScrapeResults } from '@/hooks/useSupabaseScrapeResults';
import { useScrapeOrchestrator } from '@/hooks/useScrapeOrchestrator';
import { JobStatusBadge } from '@/components/scraper/ScraperStatusBadge';
import { ScraperProgressPanel } from '@/components/scraper/ScraperProgressPanel';
import { ScraperUrlList } from '@/components/scraper/ScraperUrlList';
import { ScraperResultsView } from '@/components/scraper/ScraperResultsView';
import { ScraperResultExport } from '@/components/scraper/ScraperResultExport';
import { ScraperNewJobModal } from '@/components/scraper/ScraperNewJobModal';
import type { EditJobDefaults } from '@/components/scraper/ScraperNewJobModal';
import { SCRAPE_TYPES } from '@/types';
import type { ScrapeJobStatus, ScrapeType } from '@/types';
import { CRON_PRESETS, describeCron, validateCron, getNextRunAt } from '@/lib/cronUtils';

type Tab = 'overview' | 'urls' | 'results' | 'export' | 'schedule';

export default function ScrapeJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const { jobs, fetchJobs } = useSupabaseScrapeJobs();
  const { urls, fetchUrls } = useSupabaseScrapeUrls(jobId);
  const { results, isLoading: resultsLoading, fetchResults } = useSupabaseScrapeResults(jobId);
  const orchestrator = useScrapeOrchestrator();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [sheetsSending, setSheetsSending] = useState(false);
  const [sheetsSendStatus, setSheetsSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scheduleValue, setScheduleValue] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const prevIsRunning = useRef(false);

  const job = jobs.find(j => j.id === jobId);

  // Sync webhook URL from job data
  useEffect(() => {
    if (job?.google_sheets_webhook_url) setWebhookUrl(job.google_sheets_webhook_url);
  }, [job?.google_sheets_webhook_url]);

  // Sync schedule from job data
  useEffect(() => {
    if (job?.schedule) setScheduleValue(job.schedule);
  }, [job?.schedule]);

  const saveSchedule = useCallback(async (cron: string) => {
    if (cron && !validateCron(cron)) {
      setScheduleError('Expression cron invalide');
      return;
    }
    setScheduleError('');
    setScheduleSaving(true);
    try {
      const nextRunAt = cron ? getNextRunAt(cron) : null;
      await fetch(`/api/scraper/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: cron || null, nextRunAt }),
      });
      await fetchJobs(false);
    } finally {
      setScheduleSaving(false);
    }
  }, [jobId, fetchJobs]);

  const sendToGoogleSheets = useCallback(async (url?: string) => {
    const targetUrl = url ?? webhookUrl;
    if (!targetUrl) return;
    setSheetsSending(true);
    setSheetsSendStatus('idle');
    try {
      const res = await fetch('/api/scraper/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, webhookUrl: targetUrl }),
      });
      setSheetsSendStatus(res.ok ? 'success' : 'error');
    } catch {
      setSheetsSendStatus('error');
    } finally {
      setSheetsSending(false);
      setTimeout(() => setSheetsSendStatus('idle'), 4000);
    }
  }, [jobId, webhookUrl]);

  const saveWebhookUrl = useCallback(async (url: string) => {
    setWebhookSaving(true);
    try {
      await fetch(`/api/scraper/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleSheetsWebhookUrl: url }),
      });
      await fetchJobs(false);
    } finally {
      setWebhookSaving(false);
    }
  }, [jobId, fetchJobs]);

  // Auto-send when scraping completes
  useEffect(() => {
    if (prevIsRunning.current && !orchestrator.isRunning && job?.status === 'completed') {
      const url = webhookUrl || job?.google_sheets_webhook_url || '';
      if (url) sendToGoogleSheets(url);
    }
    prevIsRunning.current = orchestrator.isRunning;
  }, [orchestrator.isRunning, job?.status, job?.google_sheets_webhook_url, webhookUrl, sendToGoogleSheets]);

  // Polling de secours pendant le scraping (realtime pas toujours fiable sur Vercel)
  const isScrapingActive = orchestrator.isRunning || job?.status === 'running' || job?.status === 'paused';
  useEffect(() => {
    if (!isScrapingActive) return;
    const interval = setInterval(() => {
      fetchJobs(false);
      fetchUrls(false);
      fetchResults(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [isScrapingActive, fetchJobs, fetchUrls, fetchResults]);

  // Auto-start when job is pending and we navigate to the page
  const handleStart = useCallback(() => {
    if (!job) return;
    orchestrator.start({
      jobId: job.id,
      scrapeType: job.scrape_type,
      crawlDepth: job.crawl_depth,
      keywords: job.keywords?.include || [],
      excludeKeywords: job.keywords?.exclude || [],
    });
  }, [job, orchestrator]);

  const handlePause = useCallback(() => {
    if (!job) return;
    orchestrator.pause(job.id);
  }, [job, orchestrator]);

  const handleResume = useCallback(() => {
    if (!job) return;
    orchestrator.resume({
      jobId: job.id,
      scrapeType: job.scrape_type,
      crawlDepth: job.crawl_depth,
      keywords: job.keywords?.include || [],
      excludeKeywords: job.keywords?.exclude || [],
    });
  }, [job, orchestrator]);

  const handleCancel = useCallback(() => {
    if (!job) return;
    orchestrator.cancel(job.id);
  }, [job, orchestrator]);

  const handleEditAndRelaunch = useCallback(async (config: { name: string; urls: string[]; scrapeType: string; crawlDepth: number; keywords: { include: string[]; exclude: string[] } }) => {
    await fetch(`/api/scraper/jobs/${jobId}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: config.name,
        scrapeType: config.scrapeType,
        crawlDepth: config.crawlDepth,
        keywords: config.keywords,
        urls: config.urls,
      }),
    });
    await fetchJobs(false);
    await fetchUrls(false);
    setEditModalOpen(false);
  }, [jobId, fetchJobs, fetchUrls]);

  if (!job) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
        Chargement du job...
      </div>
    );
  }

  const scrapeTypeConfig = SCRAPE_TYPES.find(t => t.value === job.scrape_type);
  const isActive = job.status === 'running' || job.status === 'paused';
  const canStart = job.status === 'pending' && !orchestrator.isRunning;

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: Globe },
    { key: 'urls', label: 'URLs', icon: Link2, count: urls.length },
    { key: 'results', label: 'Résultats', icon: FileText, count: results.length },
    { key: 'export', label: 'Export', icon: Download },
    { key: 'schedule', label: 'Planification', icon: Clock },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{job.name}</h1>
            <JobStatusBadge status={job.status as ScrapeJobStatus} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
            {scrapeTypeConfig && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${scrapeTypeConfig.color} ${scrapeTypeConfig.bgColor}`}>
                {scrapeTypeConfig.label}
              </span>
            )}
            <span>Profondeur {job.crawl_depth}</span>
            {job.keywords && job.keywords.include.length > 0 && (
              <span>{job.keywords.include.length} mot{job.keywords.include.length > 1 ? 's' : ''}-clé{job.keywords.include.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setEditModalOpen(true)}
          disabled={orchestrator.isRunning}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm disabled:opacity-50"
        >
          <Pencil className="w-4 h-4" />
          Modifier et relancer
        </button>
        {canStart && (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium text-sm"
          >
            <Play className="w-4 h-4" />
            Lancer le scraping
          </button>
        )}
      </div>

      {/* Progress panel */}
      {(isActive || orchestrator.isRunning) && (
        <ScraperProgressPanel
          job={job}
          currentUrls={orchestrator.currentUrls}
          isPaused={orchestrator.isPaused}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="URLs totales" value={job.total_urls} color="blue" />
          <StatCard label="Terminées" value={job.completed_urls} color="emerald" />
          <StatCard label="Échouées" value={job.failed_urls} color="red" />
          <StatCard label="Résultats" value={job.total_results} color="violet" />

          {/* Keywords */}
          {job.keywords && (job.keywords.include.length > 0 || job.keywords.exclude.length > 0) && (
            <div className="col-span-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
              {job.keywords.include.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mots-clés recherchés</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.keywords.include.map((kw, i) => (
                      <span key={i} className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.keywords.exclude.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mots-clés exclus</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.keywords.exclude.map((kw, i) => (
                      <span key={i} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {job.error_message && (
            <div className="col-span-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Erreur</p>
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">{job.error_message}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="col-span-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Chronologie</h3>
            <div className="space-y-2 text-sm">
              <TimelineItem label="Créé le" date={job.created_at} />
              {job.started_at && <TimelineItem label="Démarré le" date={job.started_at} />}
              {job.finished_at && <TimelineItem label="Terminé le" date={job.finished_at} />}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'urls' && <ScraperUrlList urls={urls} />}

      {activeTab === 'results' && (
        <ScraperResultsView
          results={results}
          isLoading={resultsLoading}
          webhookUrl={webhookUrl || job.google_sheets_webhook_url || undefined}
          onSendToSheets={() => sendToGoogleSheets()}
          sheetsSending={sheetsSending}
          sheetsSendStatus={sheetsSendStatus}
        />
      )}

      {activeTab === 'export' && (
        <div className="space-y-4">
          {/* CSV export */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Exporter en CSV</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Exportez tous les résultats de ce job en format CSV. Le fichier contiendra la page où le mot-clé a été trouvé, le type, la valeur, le label et le contexte.
            </p>
            <div className="flex items-center gap-4">
              <ScraperResultExport results={results} jobName={job.name} />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {results.length} résultat{results.length !== 1 ? 's' : ''} à exporter
              </span>
            </div>
          </div>

          {/* Google Sheets webhook */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Table2 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Google Sheets via Apps Script</h3>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">URL du webhook Apps Script</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                />
                <button
                  onClick={() => saveWebhookUrl(webhookUrl)}
                  disabled={webhookSaving || !webhookUrl.trim()}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {webhookSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                L&apos;URL sera mémorisée pour ce job et l&apos;envoi sera automatique à la fin de chaque scraping.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => sendToGoogleSheets()}
                disabled={sheetsSending || !webhookUrl.trim() || results.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Table2 className="w-4 h-4" />
                {sheetsSending ? 'Envoi...' : `Envoyer vers Google Sheets (${results.length})`}
              </button>
              {sheetsSendStatus === 'success' && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Envoyé avec succès !</span>
              )}
              {sheetsSendStatus === 'error' && (
                <span className="text-sm text-red-500 dark:text-red-400 font-medium">Erreur lors de l&apos;envoi. Vérifie l&apos;URL du webhook.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Planification automatique</h3>
          </div>

          {job.schedule && job.next_run_at && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-300">Planning actif : {describeCron(job.schedule)}</p>
              <p className="text-blue-600 dark:text-blue-400 mt-1">
                Prochain lancement : {new Date(job.next_run_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fréquence prédéfinie</label>
            <div className="grid grid-cols-2 gap-2">
              {CRON_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setScheduleValue(preset.value)}
                  className={`px-3 py-2 rounded-lg text-sm text-left transition-colors border ${
                    scheduleValue === preset.value
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setScheduleValue('')}
                className={`px-3 py-2 rounded-lg text-sm text-left transition-colors border ${
                  !CRON_PRESETS.find(p => p.value === scheduleValue) && scheduleValue
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                }`}
              >
                Personnalisé (cron)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Expression cron
              <span className="text-slate-400 font-normal ml-2">minute heure jour mois jour_semaine</span>
            </label>
            <input
              type="text"
              value={scheduleValue}
              onChange={e => { setScheduleValue(e.target.value); setScheduleError(''); }}
              placeholder="Ex: 0 9 * * 1 (tous les lundis à 9h)"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
            />
            {scheduleError && <p className="text-xs text-red-500">{scheduleError}</p>}
            {scheduleValue && validateCron(scheduleValue) && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Prochain lancement prévu : {new Date(getNextRunAt(scheduleValue)).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => saveSchedule(scheduleValue)}
              disabled={scheduleSaving}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {scheduleSaving ? 'Sauvegarde...' : 'Activer le planning'}
            </button>
            {job.schedule && (
              <button
                onClick={() => { setScheduleValue(''); saveSchedule(''); }}
                disabled={scheduleSaving}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                Désactiver
              </button>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
            Le scraping planifié tourne automatiquement côté serveur, sans avoir besoin d&apos;ouvrir l&apos;app. Les résultats seront envoyés vers Google Sheets si un webhook est configuré dans l&apos;onglet Export.
          </div>
        </div>
      )}

      {editModalOpen && (() => {
        let currentTypes: ScrapeType[] = ['pdfs'];
        try { currentTypes = JSON.parse(job.scrape_type) as ScrapeType[]; } catch { currentTypes = [job.scrape_type as ScrapeType]; }
        const currentUrls = urls.filter(u => u.depth === 0).map(u => u.url);
        const editDefaults: EditJobDefaults = {
          name: job.name,
          urls: currentUrls,
          scrapeTypes: currentTypes,
          crawlDepth: job.crawl_depth,
          keywordsInclude: job.keywords?.include.join(', ') ?? '',
          keywordsExclude: job.keywords?.exclude.join(', ') ?? '',
        };
        return (
          <ScraperNewJobModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSubmit={handleEditAndRelaunch}
            editDefaults={editDefaults}
          />
        );
      })()}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
      <p className={`text-3xl font-bold ${colorClasses[color]?.split(' ').filter(c => c.startsWith('text-')).join(' ') || ''}`}>
        {value}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 bg-blue-500 rounded-full" />
      <span className="text-slate-500 dark:text-slate-400 w-28">{label}</span>
      <span className="text-slate-900 dark:text-white font-medium">
        {new Date(date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
}
