import { SCRAPE_RESULT_TYPES } from '@/types';
import type { ScrapeResultRow } from '@/hooks/useSupabaseScrapeResults';

interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string;
}

function escapeCsvField(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const SCRAPE_RESULT_CSV_COLUMNS: CsvColumn<ScrapeResultRow>[] = [
  { header: 'URL Source', accessor: (r) => r.source_url || '' },
  { header: 'Type', accessor: (r) => SCRAPE_RESULT_TYPES.find(t => t.value === r.result_type)?.label || r.result_type },
  { header: 'Valeur', accessor: (r) => r.value },
  { header: 'Label', accessor: (r) => r.label || '' },
  { header: 'Contexte', accessor: (r) => r.context || '' },
  { header: 'Trouvé le', accessor: (r) => new Date(r.created_at).toLocaleDateString('fr-FR') },
];

export function exportScrapeResultsCsv(results: ScrapeResultRow[], filename = 'scraping-resultats.csv') {
  const separator = ';';
  const BOM = '﻿';

  const headerRow = SCRAPE_RESULT_CSV_COLUMNS.map(c => escapeCsvField(c.header)).join(separator);
  const dataRows = results.map(result =>
    SCRAPE_RESULT_CSV_COLUMNS.map(col => escapeCsvField(col.accessor(result))).join(separator)
  );

  const csvContent = BOM + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
