import * as cheerio from 'cheerio';
import { db } from '@/lib/db';
import { scrapeUrls, scrapeResults } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { scrapeJobs } from '@/lib/db/schema';
import { compileBooleanQuery, extractTerms, isBooleanQuery } from '@/lib/booleanQuery';

const FETCH_TIMEOUT = 15000;
const DOWNLOAD_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.csv', '.txt', '.rtf', '.odt', '.ods',
];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'];

export interface ScrapeUrlParams {
  jobId: string;
  urlId: string;
  url: string;
  scrapeTypes: string[];
  keywords: string[];
  excludeKeywords: string[];
}

export interface ScrapeUrlResult {
  internalLinks: string[];
  httpStatus: number;
  pageTitle: string;
  resultsCount: number;
  error?: string;
}

export async function updateJobCounters(jobId: string) {
  try {
    const [completedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scrapeUrls)
      .where(and(eq(scrapeUrls.jobId, jobId), eq(scrapeUrls.status, 'completed')));
    const [skippedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scrapeUrls)
      .where(and(eq(scrapeUrls.jobId, jobId), eq(scrapeUrls.status, 'skipped')));
    const [failedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scrapeUrls)
      .where(and(eq(scrapeUrls.jobId, jobId), eq(scrapeUrls.status, 'failed')));
    const [resultCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scrapeResults)
      .where(eq(scrapeResults.jobId, jobId));

    await db.update(scrapeJobs).set({
      completedUrls: (completedResult?.count || 0) + (skippedResult?.count || 0),
      failedUrls: failedResult?.count || 0,
      totalResults: resultCountResult?.count || 0,
      updatedAt: new Date().toISOString(),
    }).where(eq(scrapeJobs.id, jobId));
  } catch (err) {
    console.error('Erreur mise à jour compteurs:', err);
  }
}

export async function scrapeUrl(params: ScrapeUrlParams): Promise<ScrapeUrlResult> {
  const { jobId, urlId, url, scrapeTypes, keywords, excludeKeywords } = params;

  const scrapeAll = scrapeTypes.includes('all');
  const hasLinks = scrapeAll || scrapeTypes.includes('links');
  const hasPdfs = scrapeAll || scrapeTypes.includes('pdfs');
  const hasKeywords = scrapeAll || scrapeTypes.includes('keywords');
  const hasEmails = scrapeAll;

  let html: string;
  let httpStatus = 0;
  let pageTitle = '';
  let foundPageUrl = url;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DashboardScraper/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    httpStatus = response.status;
    foundPageUrl = response.url || url;

    if (!response.ok) {
      await db.update(scrapeUrls).set({ status: 'failed', httpStatus, errorMessage: `HTTP ${httpStatus}`, scrapedAt: new Date().toISOString() }).where(eq(scrapeUrls.id, urlId));
      await updateJobCounters(jobId);
      return { internalLinks: [], httpStatus, pageTitle: '', resultsCount: 0, error: `HTTP ${httpStatus}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      await db.update(scrapeUrls).set({ status: 'skipped', httpStatus, errorMessage: `Content-Type non HTML: ${contentType}`, scrapedAt: new Date().toISOString() }).where(eq(scrapeUrls.id, urlId));
      await updateJobCounters(jobId);
      return { internalLinks: [], httpStatus, pageTitle: '', resultsCount: 0 };
    }

    html = await response.text();
  } catch (fetchErr: unknown) {
    const msg = (fetchErr as Error)?.name === 'AbortError' ? 'Timeout (15s)' : (fetchErr as Error)?.message || 'Erreur réseau';
    await db.update(scrapeUrls).set({ status: 'failed', errorMessage: msg, scrapedAt: new Date().toISOString() }).where(eq(scrapeUrls.id, urlId));
    await updateJobCounters(jobId);
    return { internalLinks: [], httpStatus, pageTitle: '', resultsCount: 0, error: msg };
  }

  const $ = cheerio.load(html);
  pageTitle = $('title').first().text().trim() || '';
  const baseUrl = new URL(foundPageUrl);
  const results: Parameters<typeof db.insert>[0] extends never ? never : Array<{
    id: string; jobId: string; urlId: string; sourceUrl: string;
    resultType: string; value: string; label: string | null;
    context: string | null; metadata: string | null; createdAt: string;
  }> = [];
  const seenValues = new Set<string>();
  const now = new Date().toISOString();

  const resolveUrl = (href: string): string | null => {
    try { const r = new URL(href, foundPageUrl); r.hash = ''; return r.href; } catch { return null; }
  };
  const isInternal = (href: string): boolean => {
    try { return new URL(href).hostname === baseUrl.hostname; } catch { return false; }
  };
  const addResult = (type: string, value: string, label: string | null, context: string | null, metadata: Record<string, unknown> = {}) => {
    if (seenValues.has(`${type}:${value}`)) return;
    if (type === 'keyword_match' && excludeKeywords.length > 0) {
      const searchText = `${value} ${context || ''}`.toLowerCase();
      if (excludeKeywords.some((ex: string) => searchText.includes(ex.toLowerCase()))) return;
    }
    seenValues.add(`${type}:${value}`);
    results.push({ id: crypto.randomUUID(), jobId, urlId, sourceUrl: foundPageUrl, resultType: type, value, label, context, metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null, createdAt: now });
  };

  if (hasLinks) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
      const resolved = resolveUrl(href);
      if (!resolved) return;
      addResult('link', resolved, $(el).text().trim().substring(0, 200) || null, null);
    });
  }

  if (hasPdfs) {
    const includeKws: string[] = Array.isArray(keywords) ? keywords : [];
    const filterByKeywords = includeKws.length
      ? (fileUrl: string, text: string) => includeKws.some(kw => `${fileUrl} ${text}`.toLowerCase().includes(kw.toLowerCase()))
      : () => true;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const resolved = resolveUrl(href);
      if (!resolved) return;
      const lowerHref = resolved.toLowerCase();
      const linkText = $(el).text().trim().substring(0, 200);
      if (lowerHref.includes('.pdf')) {
        if (filterByKeywords(resolved, linkText)) addResult('pdf', resolved, linkText || null, null, { extension: '.pdf' });
      } else if (DOWNLOAD_EXTENSIONS.some(ext => lowerHref.includes(ext))) {
        const ext = DOWNLOAD_EXTENSIONS.find(e => lowerHref.includes(e)) || '';
        if (filterByKeywords(resolved, linkText)) addResult('download', resolved, linkText || null, null, { extension: ext });
      }
    });
  }

  if (hasKeywords && keywords && keywords.length > 0) {
    $('script, style, noscript').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    for (const keyword of keywords) {
      if (!keyword.trim()) continue;
      if (isBooleanQuery(keyword)) {
        const evaluate = compileBooleanQuery(keyword);
        if (evaluate(bodyText)) {
          const terms = extractTerms(keyword);
          const matchedTerms = terms.filter(t => bodyText.toLowerCase().includes(t.toLowerCase()));
          const firstTerm = matchedTerms[0];
          let context = '';
          if (firstTerm) {
            const idx = bodyText.toLowerCase().indexOf(firstTerm.toLowerCase());
            context = `...${bodyText.substring(Math.max(0, idx - 100), Math.min(bodyText.length, idx + firstTerm.length + 100)).trim()}...`;
          }
          // On stocke le(s) mot(s)-clé(s) réellement trouvé(s) comme valeur,
          // et on conserve la requête booléenne complète dans les métadonnées.
          const matchedValue = matchedTerms.length ? matchedTerms.join(', ') : keyword;
          addResult('keyword_match', matchedValue, null, context || null, { pageUrl: foundPageUrl, pageTitle, booleanQuery: true, query: keyword });
        }
      } else {
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKeyword, 'gi');
        let match;
        let matchCount = 0;
        while ((match = regex.exec(bodyText)) !== null && matchCount < 10) {
          const start = Math.max(0, match.index - 100);
          const end = Math.min(bodyText.length, match.index + keyword.length + 100);
          addResult('keyword_match', keyword, null, `...${bodyText.substring(start, end).trim()}...`, { pageUrl: foundPageUrl, pageTitle, position: match.index, matchNumber: matchCount + 1 });
          matchCount++;
        }
      }
    }
  }

  if (hasEmails) {
    const bodyText = $('body').text();
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let emailMatch;
    while ((emailMatch = emailRegex.exec(bodyText)) !== null) addResult('email', emailMatch[0], null, null);
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const email = href.replace('mailto:', '').split('?')[0];
      if (email) addResult('email', email, $(el).text().trim() || null, null);
    });
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (!src) return;
      const resolved = resolveUrl(src);
      if (!resolved) return;
      if (IMAGE_EXTENSIONS.some(ext => resolved.toLowerCase().includes(ext))) {
        addResult('image', resolved, $(el).attr('alt')?.trim().substring(0, 200) || null, null);
      }
    });
  }

  const internalLinksSet = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
    const resolved = resolveUrl(href);
    if (resolved && isInternal(resolved) && resolved !== foundPageUrl) internalLinksSet.add(resolved);
  });

  if (results.length > 0) {
    try { await db.insert(scrapeResults).values(results); } catch (err) { console.error('Erreur insertion résultats:', err); }
  }

  await db.update(scrapeUrls).set({ status: 'completed', httpStatus, pageTitle: pageTitle.substring(0, 500), scrapedAt: new Date().toISOString() }).where(eq(scrapeUrls.id, urlId));
  await updateJobCounters(jobId);

  return { internalLinks: Array.from(internalLinksSet), httpStatus, pageTitle, resultsCount: results.length };
}
