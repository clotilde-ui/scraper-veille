'use client';

import { ExternalLink } from 'lucide-react';
import { UrlStatusBadge } from './ScraperStatusBadge';
import type { ScrapeUrlRow } from '@/hooks/useSupabaseScrapeUrls';
import type { ScrapeUrlStatus } from '@/types';

interface ScraperUrlListProps {
  urls: ScrapeUrlRow[];
}

export function ScraperUrlList({ urls }: ScraperUrlListProps) {
  const grouped = urls.reduce<Record<number, ScrapeUrlRow[]>>((acc, url) => {
    const d = url.depth;
    if (!acc[d]) acc[d] = [];
    acc[d].push(url);
    return acc;
  }, {});

  const depths = Object.keys(grouped).map(Number).sort();

  return (
    <div className="space-y-4">
      {depths.map(depth => (
        <div key={depth}>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {depth === 0 ? 'URLs originales (CSV)' : `Profondeur ${depth} (découvertes)`}
            <span className="ml-2 text-slate-400 font-normal">({grouped[depth].length})</span>
          </h3>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">URL</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-24">Statut</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-16">HTTP</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-48">Titre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {grouped[depth].map(url => (
                  <tr key={url.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-900 dark:text-white font-mono truncate max-w-md">{url.url}</span>
                        <a
                          href={url.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-slate-400 hover:text-blue-500 flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      {url.error_message && (
                        <p className="text-xs text-red-500 mt-0.5">{url.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <UrlStatusBadge status={url.status as ScrapeUrlStatus} />
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                      {url.http_status || '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 truncate max-w-[12rem]">
                      {url.page_title || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {urls.length === 0 && (
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">
          Aucune URL
        </div>
      )}
    </div>
  );
}
