import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeJobs, scrapeUrls, scrapeResults } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import * as cheerio from 'cheerio';

const FETCH_TIMEOUT = 15000;

const DOWNLOAD_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.csv', '.txt', '.rtf', '.odt', '.ods',
];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'];

async function updateJobCounters(jobId: string) {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId, urlId, url, scrapeType: rawScrapeType, keywords } = body;

    if (!jobId || !urlId || !url) {
      return NextResponse.json({ error: 'jobId, urlId et url requis' }, { status: 400 });
    }

    // Normalize scrapeType: supports legacy string ('all','links',...) or array ['pdfs','keywords']
    let scrapeTypes: string[];
    if (Array.isArray(rawScrapeType)) {
      scrapeTypes = rawScrapeType;
    } else if (typeof rawScrapeType === 'string') {
      try { scrapeTypes = JSON.parse(rawScrapeType); } catch { scrapeTypes = [rawScrapeType]; }
    } else {
      scrapeTypes = ['links'];
    }
    const scrapeAll = scrapeTypes.includes('all');
    const hasLinks = scrapeAll || scrapeTypes.includes('links');
    const hasPdfs = scrapeAll || scrapeTypes.includes('pdfs');
    const hasKeywords = scrapeAll || scrapeTypes.includes('keywords');
    const hasEmails = scrapeAll;

    let html: string;
    let httpStatus: number;
    let pageTitle = '';

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

      if (!response.ok) {
        await db.update(scrapeUrls).set({
          status: 'failed',
          httpStatus: httpStatus,
          errorMessage: `HTTP ${httpStatus}`,
          scrapedAt: new Date().toISOString(),
        }).where(eq(scrapeUrls.id, urlId));

        await updateJobCounters(jobId);

        return NextResponse.json({
          error: `HTTP ${httpStatus}`,
          httpStatus,
          results: [],
          internalLinks: [],
        });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        await db.update(scrapeUrls).set({
          status: 'skipped',
          httpStatus: httpStatus,
          errorMessage: `Content-Type non HTML: ${contentType}`,
          scrapedAt: new Date().toISOString(),
        }).where(eq(scrapeUrls.id, urlId));

        await updateJobCounters(jobId);

        return NextResponse.json({
          results: [],
          internalLinks: [],
          httpStatus,
          pageTitle: '',
        });
      }

      html = await response.text();
    } catch (fetchErr: unknown) {
      const msg = (fetchErr as Error)?.name === 'AbortError'
        ? 'Timeout (15s)'
        : (fetchErr as Error)?.message || 'Erreur réseau';

      await db.update(scrapeUrls).set({
        status: 'failed',
        errorMessage: msg,
        scrapedAt: new Date().toISOString(),
      }).where(eq(scrapeUrls.id, urlId));

      await updateJobCounters(jobId);

      return NextResponse.json({ error: msg, results: [], internalLinks: [] }, { status: 502 });
    }

    const $ = cheerio.load(html);
    pageTitle = $('title').first().text().trim() || '';

    const baseUrl = new URL(url);
    const results: Array<{
      id: string;
      jobId: string;
      urlId: string;
      sourceUrl: string;
      resultType: string;
      value: string;
      label: string | null;
      context: string | null;
      metadata: string | null;
      createdAt: string;
    }> = [];
    const seenValues = new Set<string>();

    const resolveUrl = (href: string): string | null => {
      try {
        const resolved = new URL(href, url);
        resolved.hash = '';
        return resolved.href;
      } catch {
        return null;
      }
    };

    const isInternal = (href: string): boolean => {
      try {
        const parsed = new URL(href);
        return parsed.hostname === baseUrl.hostname;
      } catch {
        return false;
      }
    };

    const now = new Date().toISOString();
    const addResult = (type: string, value: string, label: string | null, context: string | null, metadata: Record<string, unknown> = {}) => {
      if (seenValues.has(`${type}:${value}`)) return;
      seenValues.add(`${type}:${value}`);
      results.push({
        id: crypto.randomUUID(),
        jobId: jobId,
        urlId: urlId,
        sourceUrl: url,
        resultType: type,
        value,
        label,
        context,
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
        createdAt: now,
      });
    };

    if (hasLinks) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
        const resolved = resolveUrl(href);
        if (!resolved) return;
        const linkText = $(el).text().trim().substring(0, 200);
        addResult('link', resolved, linkText || null, null);
      });
    }

    if (hasPdfs) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const resolved = resolveUrl(href);
        if (!resolved) return;
        const lowerHref = resolved.toLowerCase();
        const isPdf = lowerHref.includes('.pdf');
        const isDownload = DOWNLOAD_EXTENSIONS.some(ext => lowerHref.includes(ext));
        if (isPdf) {
          const linkText = $(el).text().trim().substring(0, 200);
          addResult('pdf', resolved, linkText || null, null, { extension: '.pdf' });
        } else if (isDownload) {
          const ext = DOWNLOAD_EXTENSIONS.find(e => lowerHref.includes(e)) || '';
          const linkText = $(el).text().trim().substring(0, 200);
          addResult('download', resolved, linkText || null, null, { extension: ext });
        }
      });
    }

    if (hasKeywords) {
      if (keywords && keywords.length > 0) {
        $('script, style, noscript').remove();
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
          if (!keyword.trim()) continue;
          const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedKeyword, 'gi');
          let match;
          let matchCount = 0;
          while ((match = regex.exec(bodyText)) !== null && matchCount < 10) {
            const start = Math.max(0, match.index - 100);
            const end = Math.min(bodyText.length, match.index + keyword.length + 100);
            const context = bodyText.substring(start, end).trim();
            addResult('keyword_match', keyword, null, `...${context}...`, {
              position: match.index,
              matchNumber: matchCount + 1,
            });
            matchCount++;
          }
        }
      }
    }

    if (hasEmails) {
      const bodyText = $('body').text();
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      let emailMatch;
      while ((emailMatch = emailRegex.exec(bodyText)) !== null) {
        addResult('email', emailMatch[0], null, null);
      }
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const email = href.replace('mailto:', '').split('?')[0];
        if (email) addResult('email', email, $(el).text().trim() || null, null);
      });
    }

    if (hasEmails) {
      $('img[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (!src) return;
        const resolved = resolveUrl(src);
        if (!resolved) return;
        const lowerSrc = resolved.toLowerCase();
        if (IMAGE_EXTENSIONS.some(ext => lowerSrc.includes(ext))) {
          const alt = $(el).attr('alt')?.trim().substring(0, 200) || null;
          addResult('image', resolved, alt, null);
        }
      });
    }

    const internalLinksSet = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
      const resolved = resolveUrl(href);
      if (resolved && isInternal(resolved) && resolved !== url) {
        internalLinksSet.add(resolved);
      }
    });

    if (results.length > 0) {
      try {
        await db.insert(scrapeResults).values(results);
      } catch (err) {
        console.error('Erreur insertion résultats:', err);
      }
    }

    await db.update(scrapeUrls).set({
      status: 'completed',
      httpStatus: httpStatus,
      pageTitle: pageTitle.substring(0, 500),
      scrapedAt: new Date().toISOString(),
    }).where(eq(scrapeUrls.id, urlId));

    await updateJobCounters(jobId);

    return NextResponse.json({
      results: results.length,
      internalLinks: Array.from(internalLinksSet),
      httpStatus,
      pageTitle,
    });
  } catch (error) {
    console.error('Erreur API scrape:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
