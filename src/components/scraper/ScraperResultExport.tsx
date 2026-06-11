'use client';

import { Download } from 'lucide-react';
import { exportScrapeResultsCsv } from '@/lib/export';
import type { DbScrapeResult } from '@/types/supabase';

interface ScraperResultExportProps {
  results: DbScrapeResult[];
  jobName: string;
}

export function ScraperResultExport({ results, jobName }: ScraperResultExportProps) {
  const handleExport = () => {
    if (results.length === 0) return;
    const safeJobName = jobName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    exportScrapeResultsCsv(results, `scraping_${safeJobName}`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={results.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Download className="w-4 h-4" />
      Exporter CSV ({results.length})
    </button>
  );
}
