'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Globe, FileText, AlertTriangle, CheckCircle, LayoutGrid, List as ListIcon } from 'lucide-react';
import { useSupabaseScrapeJobs } from '@/hooks/useSupabaseScrapeJobs';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'sonner';
import { ScraperJobCard } from '@/components/scraper/ScraperJobCard';
import { ScraperJobList } from '@/components/scraper/ScraperJobList';
import { ScraperNewJobModal } from '@/components/scraper/ScraperNewJobModal';
import { Pagination } from '@/components/Pagination';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { DbScrapeJobWithCreator } from '@/types/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ScrapeType } from '@/types';

export default function OutilsWebPage() {
  const { jobs, isLoading, error, addJob, deleteJob, retry, fetchJobs } = useSupabaseScrapeJobs();
  const { user } = useSupabaseAuth();
  const { confirm } = useConfirm();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter
  const filtered = statusFilter === 'all'
    ? jobs
    : jobs.filter(j => j.status === statusFilter);

  // Pagination
  const totalItems = filtered.length;
  const paginated = itemsPerPage === 0
    ? filtered
    : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Polling quand un job est en cours (mise à jour compteurs en temps réel)
  const hasActiveJobs = jobs.some(j => j.status === 'running' || j.status === 'paused');
  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = setInterval(() => fetchJobs(false), 3000);
    return () => clearInterval(interval);
  }, [hasActiveJobs, fetchJobs]);

  // Stats
  const totalJobs = jobs.length;
  const runningJobs = jobs.filter(j => j.status === 'running' || j.status === 'paused').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const totalResults = jobs.reduce((sum, j) => sum + j.total_results, 0);

  const handleNewJob = useCallback(async (config: {
    name: string;
    urls: string[];
    scrapeType: ScrapeType;
    crawlDepth: number;
    keywords: string[];
  }) => {
    if (!user) return;

    // Create job
    const job = await addJob({
      name: config.name,
      scrape_type: config.scrapeType,
      crawl_depth: config.crawlDepth,
      keywords: config.keywords.length > 0 ? config.keywords : null,
      total_urls: config.urls.length,
      created_by: user.id,
    });

    if (!job) {
      toast.error('Erreur lors de la création du job');
      return;
    }

    // Insert initial URLs
    const urlsData = config.urls.map(url => ({
      job_id: job.id,
      url,
      status: 'pending' as const,
      depth: 0,
    }));

    const { error: urlError } = await supabase.from('scrape_urls').insert(urlsData);
    if (urlError) {
      toast.error('Erreur lors de l\'insertion des URLs');
      return;
    }

    toast.success(`Job "${config.name}" créé avec ${config.urls.length} URLs`);

    // Navigate to job detail
    router.push(`/outils-web/${job.id}`);
  }, [user, addJob, supabase, router]);

  const handleDelete = useCallback(async (job: DbScrapeJobWithCreator) => {
    const confirmed = await confirm(
      `Supprimer le job "${job.name}" et tous ses résultats ?`,
      { title: 'Supprimer le job', variant: 'danger', confirmText: 'Supprimer' }
    );
    if (!confirmed) return;

    const success = await deleteJob(job.id);
    if (success) {
      toast.success('Job supprimé');
    } else {
      toast.error('Erreur lors de la suppression');
    }
  }, [confirm, deleteJob]);

  const handleSelect = useCallback((job: DbScrapeJobWithCreator) => {
    router.push(`/outils-web/${job.id}`);
  }, [router]);

  return (
    <div className="px-8 py-8 lg:px-10 lg:py-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Web Scraping</h1>
          <p className="text-sm text-text-secondary mt-1">
            Scraper des sites web pour extraire liens, PDFs, mots-clés et plus
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau scraping
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="surface-card p-4 animate-card-enter">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-light rounded-xl">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{totalJobs}</p>
              <p className="text-xs text-text-secondary">Total jobs</p>
            </div>
          </div>
        </div>
        <div className="surface-card p-4 animate-card-enter" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-warning-light rounded-xl">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{runningJobs}</p>
              <p className="text-xs text-text-secondary">En cours</p>
            </div>
          </div>
        </div>
        <div className="surface-card p-4 animate-card-enter" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-success-light rounded-xl">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{completedJobs}</p>
              <p className="text-xs text-text-secondary">Terminés</p>
            </div>
          </div>
        </div>
        <div className="surface-card p-4 animate-card-enter" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-light rounded-xl">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{totalResults}</p>
              <p className="text-xs text-text-secondary">Résultats</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + View mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px] text-sm">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="running">En cours</SelectItem>
              <SelectItem value="paused">En pause</SelectItem>
              <SelectItem value="completed">Terminés</SelectItem>
              <SelectItem value="failed">Échoués</SelectItem>
              <SelectItem value="cancelled">Annulés</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 bg-surface-secondary rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-surface shadow-sm text-primary' : 'text-text-secondary'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-surface shadow-sm text-primary' : 'text-text-secondary'}`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-light border border-border-default rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-danger">{error}</p>
          <button onClick={retry} className="text-sm text-danger font-medium hover:underline">Réessayer</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-text-secondary">
          Chargement...
        </div>
      )}

      {/* Content */}
      {!isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((job, i) => (
            <div key={job.id} className="animate-card-enter" style={{ animationDelay: `${i * 50}ms` }}>
              <ScraperJobCard
                job={job}
                onClick={() => handleSelect(job)}
                onDelete={(e) => { e.stopPropagation(); handleDelete(job); }}
              />
            </div>
          ))}
          {paginated.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 text-text-secondary">
              {statusFilter !== 'all' ? 'Aucun job avec ce statut' : 'Aucun job de scraping. Créez-en un pour commencer !'}
            </div>
          )}
        </div>
      )}

      {!isLoading && viewMode === 'table' && (
        <ScraperJobList
          jobs={paginated}
          onSelect={handleSelect}
          onDelete={handleDelete}
        />
      )}

      {/* Pagination */}
      <Pagination
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
      />

      {/* Modal */}
      <ScraperNewJobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleNewJob}
      />
    </div>
  );
}
