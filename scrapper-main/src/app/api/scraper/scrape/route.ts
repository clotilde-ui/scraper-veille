import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import type { SupabaseClient } from '@supabase/supabase-js';

const FETCH_TIMEOUT = 15000; // 15s pour laisser 15s traitement + DB

// Extensions de fichiers téléchargeables
const DOWNLOAD_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.csv', '.txt', '.rtf', '.odt', '.ods',
];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'];

// Helper : mettre à jour les compteurs du job (appelé dans TOUS les cas)
async function updateJobCounters(client: SupabaseClient, jobId: string) {
  try {
    const [completed, failed, skipped, resultCount] = await Promise.all([
      client.from('scrape_urls').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'completed'),
      client.from('scrape_urls').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'failed'),
      client.from('scrape_urls').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'skipped'),
      client.from('scrape_results').select('*', { count: 'exact', head: true }).eq('job_id', jobId),
    ]);

    await client.from('scrape_jobs').update({
      completed_urls: (completed.count || 0) + (skipped.count || 0),
      failed_urls: failed.count || 0,
      total_results: resultCount.count || 0,
    }).eq('id', jobId);
  } catch (err) {
    console.error('Erreur mise à jour compteurs:', err);
  }
}

// POST - Scraper une seule URL
export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, urlId, url, scrapeType, keywords } = body;

    if (!jobId || !urlId || !url) {
      return NextResponse.json({ error: 'jobId, urlId et url requis' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Fetch la page
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
        // Marquer URL en échec + MAJ compteurs
        await adminClient.from('scrape_urls').update({
          status: 'failed',
          http_status: httpStatus,
          error_message: `HTTP ${httpStatus}`,
          scraped_at: new Date().toISOString(),
        }).eq('id', urlId);

        await updateJobCounters(adminClient, jobId);

        return NextResponse.json({
          error: `HTTP ${httpStatus}`,
          httpStatus,
          results: [],
          internalLinks: [],
        });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        // Pas du HTML — skip + MAJ compteurs
        await adminClient.from('scrape_urls').update({
          status: 'skipped',
          http_status: httpStatus,
          error_message: `Content-Type non HTML: ${contentType}`,
          scraped_at: new Date().toISOString(),
        }).eq('id', urlId);

        await updateJobCounters(adminClient, jobId);

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

      await adminClient.from('scrape_urls').update({
        status: 'failed',
        error_message: msg,
        scraped_at: new Date().toISOString(),
      }).eq('id', urlId);

      await updateJobCounters(adminClient, jobId);

      return NextResponse.json({ error: msg, results: [], internalLinks: [] }, { status: 502 });
    }

    // Parse avec cheerio
    const $ = cheerio.load(html);
    pageTitle = $('title').first().text().trim() || '';

    const baseUrl = new URL(url);
    const results: Array<{
      job_id: string;
      url_id: string;
      source_url: string;
      result_type: string;
      value: string;
      label: string | null;
      context: string | null;
      metadata: Record<string, unknown>;
    }> = [];
    const seenValues = new Set<string>();

    // Helper : résoudre URL relative
    const resolveUrl = (href: string): string | null => {
      try {
        const resolved = new URL(href, url);
        resolved.hash = '';
        return resolved.href;
      } catch {
        return null;
      }
    };

    // Helper : vérifier si lien interne
    const isInternal = (href: string): boolean => {
      try {
        const parsed = new URL(href);
        return parsed.hostname === baseUrl.hostname;
      } catch {
        return false;
      }
    };

    // Helper : ajouter un résultat sans doublon
    const addResult = (type: string, value: string, label: string | null, context: string | null, metadata: Record<string, unknown> = {}) => {
      if (seenValues.has(`${type}:${value}`)) return;
      seenValues.add(`${type}:${value}`);
      results.push({
        job_id: jobId,
        url_id: urlId,
        source_url: url,
        result_type: type,
        value,
        label,
        context,
        metadata,
      });
    };

    // --- Extraction des liens ---
    if (scrapeType === 'links' || scrapeType === 'all') {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

        const resolved = resolveUrl(href);
        if (!resolved) return;

        const linkText = $(el).text().trim().substring(0, 200);
        addResult('link', resolved, linkText || null, null);
      });
    }

    // --- Extraction PDFs / fichiers téléchargeables ---
    if (scrapeType === 'pdfs' || scrapeType === 'all') {
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

    // --- Extraction mots-clés ---
    if (scrapeType === 'keywords' || scrapeType === 'all') {
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

    // --- Extraction emails (si type 'all') ---
    if (scrapeType === 'all') {
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

    // --- Extraction images (si type 'all') ---
    if (scrapeType === 'all') {
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

    // --- Collecte liens internes pour crawl ---
    const internalLinksSet = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
      const resolved = resolveUrl(href);
      if (resolved && isInternal(resolved) && resolved !== url) {
        internalLinksSet.add(resolved);
      }
    });

    // --- Sauvegarder résultats en DB ---
    if (results.length > 0) {
      const { error: insertError } = await adminClient
        .from('scrape_results')
        .insert(results);

      if (insertError) {
        console.error('Erreur insertion résultats:', insertError.message);
      }
    }

    // --- Mettre à jour l'URL ---
    await adminClient.from('scrape_urls').update({
      status: 'completed',
      http_status: httpStatus,
      page_title: pageTitle.substring(0, 500),
      scraped_at: new Date().toISOString(),
    }).eq('id', urlId);

    // --- Mettre à jour les compteurs du job ---
    await updateJobCounters(adminClient, jobId);

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
