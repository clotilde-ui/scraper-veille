// ============================================
// Types pour les Outils Web (Scraper)
// ============================================

export type ScrapeJobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type ScrapeType = 'links' | 'pdfs' | 'keywords' | 'all';
export type ScrapeUrlStatus = 'pending' | 'scraping' | 'completed' | 'failed' | 'skipped';
export type ScrapeResultType = 'link' | 'pdf' | 'download' | 'keyword_match' | 'image' | 'email';

export interface ScrapeJob {
  id: string;
  name: string;
  status: ScrapeJobStatus;
  scrapeType: ScrapeType;
  crawlDepth: number;
  keywords: string[] | null;
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  totalResults: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeUrl {
  id: string;
  jobId: string;
  url: string;
  status: ScrapeUrlStatus;
  depth: number;
  parentUrlId: string | null;
  httpStatus: number | null;
  errorMessage: string | null;
  pageTitle: string | null;
  scrapedAt: string | null;
  createdAt: string;
}

export interface ScrapeResult {
  id: string;
  jobId: string;
  urlId: string;
  resultType: ScrapeResultType;
  value: string;
  label: string | null;
  context: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const SCRAPE_JOB_STATUSES: { value: ScrapeJobStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'pending', label: 'En attente', color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-700' },
  { value: 'running', label: 'En cours', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'paused', label: 'En pause', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'completed', label: 'Terminé', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { value: 'failed', label: 'Échoué', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'cancelled', label: 'Annulé', color: 'text-slate-500 dark:text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-700' },
];

export const SCRAPE_TYPES: { value: ScrapeType; label: string; description: string; color: string; bgColor: string }[] = [
  { value: 'links', label: 'Liens', description: 'Trouver tous les liens sur la page', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'pdfs', label: 'PDFs / Fichiers', description: 'Trouver les PDFs et fichiers téléchargeables', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'keywords', label: 'Mots-clés', description: 'Chercher des mots-clés spécifiques', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { value: 'all', label: 'Tout', description: 'Liens, fichiers, mots-clés et emails', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
];

export const SCRAPE_RESULT_TYPES: { value: ScrapeResultType; label: string; color: string; bgColor: string }[] = [
  { value: 'link', label: 'Lien', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'pdf', label: 'PDF', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'download', label: 'Téléchargement', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'keyword_match', label: 'Mot-clé', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { value: 'image', label: 'Image', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { value: 'email', label: 'Email', color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
];
