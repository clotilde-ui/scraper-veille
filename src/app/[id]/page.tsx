'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Globe, FileText, Link2, Download } from 'lucide-react';
import { useSupabaseScrapeJobs } from '@/hooks/useSupabaseScrapeJobs';
import { useSupabaseScrapeUrls } from '@/hooks/useSupabaseScrapeUrls';
import { useSupabaseScrapeResults } from '@/hooks/useSupabaseScrapeResults';
import { useScrapeOrchestrator } from '@/hooks/useScrapeOrchestrator';
import { JobStatusBadge } from '@/components/scraper/ScraperStatusBadge';
import { ScraperProgressPanel } from '@/components/scraper/ScraperProgressPanel';
import { ScraperUrlList } from '@/components/scraper/ScraperUrlList';
import { ScraperResultsView } from '@/components/scraper/ScraperResultsView';
import { ScraperResultExport } from '@/components/scraper/ScraperResultExport';
import { SCRAPE_TYPES } from '@/types';
import type { ScrapeJobStatus } from '@/types';

type Tab = 'overview' | 'urls' | 'results' | 'export';

export default function ScrapeJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const { jobs, fetchJobs } = useSupabaseScrapeJobs();
  const { urls, fetchUrls } = useSupabaseScrapeUrls(jobId);
  const { results, isLoading: resultsLoading, fetchResults } = useSupabaseScrapeResults(jobId);
  const orchestrator = useScrapeOrchestrator();

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const job = jobs.find(j => j.id === jobId);

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
      keywords: job.keywords || [],
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
      keywords: job.keywords || [],
    });
  }, [job, orchestrator]);

  const handleCancel = useCallback(() => {
    if (!job) return;
    orchestrator.cancel(job.id);
  }, [job, orchestrator]);

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
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/outils-web')}
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
            {job.keywords && job.keywords.length > 0 && (
              <span>{job.keywords.length} mot{job.keywords.length > 1 ? 's' : ''}-clé{job.keywords.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
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
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
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
          {job.keywords && job.keywords.length > 0 && (
            <div className="col-span-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mots-clés recherchés</h3>
              <div className="flex flex-wrap gap-2">
                {job.keywords.map((kw, i) => (
                  <span key={i} className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm">
                    {kw}
                  </span>
                ))}
              </div>
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
        <ScraperResultsView results={results} isLoading={resultsLoading} />
      )}

      {activeTab === 'export' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Exporter les résultats</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Exportez tous les résultats de ce job en format CSV. Le fichier contiendra l'URL source, le type, la valeur, le label et le contexte.
          </p>
          <div className="flex items-center gap-4">
            <ScraperResultExport results={results} jobName={job.name} />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {results.length} résultat{results.length !== 1 ? 's' : ''} à exporter
            </span>
          </div>
        </div>
      )}
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
