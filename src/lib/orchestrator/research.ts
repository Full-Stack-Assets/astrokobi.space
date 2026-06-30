import * as cheerio from 'cheerio';
import { Innertube } from 'youtubei.js';
import type { ScoredItem, ResearchBundle, RawItem } from './types';
import { siteConfig } from '@/site.config';

// Polite, identifiable scraper UA derived from the site config.
const SCRAPER_UA = `Mozilla/5.0 (compatible; ${siteConfig.name.replace(/\s+/g, '')}/1.0; +${siteConfig.url})`;

interface BraveWebResult {
  url: string;
  title: string;
  description: string;
}

async function braveWebSearch(query: string): Promise<BraveWebResult[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return [];

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', '8');

  const res = await fetch(url, {
    headers: { 'x-subscription-token': key, accept: 'application/json' },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { web?: { results?: BraveWebResult[] } };
  return json.web?.results ?? [];
}

/** Keyless fallback when Brave is unset or returns nothing (common in seed runs). */
async function wikipediaSearch(query: string): Promise<BraveWebResult[]> {
  try {
    const api = new URL('https://en.wikipedia.org/w/api.php');
    api.searchParams.set('action', 'query');
    api.searchParams.set('list', 'search');
    api.searchParams.set('srsearch', query);
    api.searchParams.set('format', 'json');
    api.searchParams.set('srlimit', '3');
    api.searchParams.set('origin', '*');

    const res = await fetch(api.toString(), { headers: { 'user-agent': SCRAPER_UA } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      query?: { search?: Array<{ title: string; snippet: string }> };
    };
    return (json.query?.search ?? []).map((hit) => ({
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`,
      title: hit.title,
      description: hit.snippet.replace(/<[^>]+>/g, ''),
    }));
  } catch {
    return [];
  }
}

async function scrapeArticle(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': SCRAPER_UA },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // Strip noise
    $('script, style, nav, footer, aside, iframe, .advertisement, .ad, [role=navigation]').remove();

    const title = $('meta[property="og:title"]').attr('content') ?? $('title').text() ?? '';

    // Prefer article tags, fall back to main, then body paragraphs
    const paragraphs: string[] = [];
    const container = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
    container.find('p, h2, h3, li').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 40) paragraphs.push(text);
    });

    const content = paragraphs.join('\n\n').slice(0, 6000);
    return { title: title.trim(), content };
  } catch {
    return null;
  }
}

async function fetchTranscript(videoId: string): Promise<{ title: string; text: string } | null> {
  try {
    const yt = await Innertube.create({ retrieve_player: false });
    const info = await yt.getInfo(videoId);
    const transcriptData = await info.getTranscript();
    const text = transcriptData.transcript.content?.body?.initial_segments
      ?.map((s) => s.snippet.text)
      .join(' ')
      .slice(0, 5000);
    if (!text) return null;
    return { title: info.basic_info.title ?? '', text };
  } catch {
    return null;
  }
}

function extractVideoId(url: string): string | null {
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ?? url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export async function research(
  winner: ScoredItem,
  allItems: RawItem[]
): Promise<ResearchBundle> {
  // Build a search query from the winner's title, stripping common filler
  const query = winner.title.replace(/[^\w\s]/g, ' ').split(/\s+/).slice(0, 10).join(' ');

  let searchResults = await braveWebSearch(query);
  if (searchResults.length === 0) {
    console.warn('[research] Brave returned nothing — trying Wikipedia fallback');
    searchResults = await wikipediaSearch(query);
  }

  // Scrape top 3 unique domains, excluding the winner's own URL
  const winnerHost = (() => {
    try { return new URL(winner.url).hostname; } catch { return ''; }
  })();
  const seenHosts = new Set<string>([winnerHost]);
  const toScrape = searchResults
    .filter((r) => {
      try {
        const h = new URL(r.url).hostname;
        if (seenHosts.has(h)) return false;
        seenHosts.add(h);
        return true;
      } catch { return false; }
    })
    .slice(0, 3);

  const articles = (
    await Promise.all(
      toScrape.map(async (r) => {
        const s = await scrapeArticle(r.url);
        return s ? { url: r.url, title: s.title || r.title, content: s.content } : null;
      })
    )
  ).filter((a): a is NonNullable<typeof a> => a !== null);

  // If winner itself is non-YouTube, also try to scrape it
  if (winner.source !== 'youtube') {
    const w = await scrapeArticle(winner.url);
    if (w) articles.unshift({ url: winner.url, title: w.title || winner.title, content: w.content });
  }

  // Pull transcripts from any related YouTube items (and the winner if it's YT)
  const videoIds = new Set<string>();
  if (winner.source === 'youtube') {
    const id = extractVideoId(winner.url);
    if (id) videoIds.add(id);
  }
  for (const it of allItems) {
    if (it.source !== 'youtube') continue;
    if (!it.title.toLowerCase().split(/\s+/).some((w) => query.toLowerCase().includes(w))) continue;
    const id = extractVideoId(it.url);
    if (id) videoIds.add(id);
    if (videoIds.size >= 2) break;
  }

  const transcripts = (
    await Promise.all(
      [...videoIds].map(async (id) => {
        const t = await fetchTranscript(id);
        return t ? { videoId: id, title: t.title, text: t.text } : null;
      })
    )
  ).filter((t): t is NonNullable<typeof t> => t !== null);

  // Keep a handful of "related" headlines for context
  const related = allItems
    .filter((it) => it.id !== winner.id)
    .filter((it) => {
      const a = new Set(it.title.toLowerCase().split(/\s+/));
      const b = new Set(winner.title.toLowerCase().split(/\s+/));
      let overlap = 0;
      for (const w of a) if (b.has(w) && w.length > 3) overlap++;
      return overlap >= 2;
    })
    .slice(0, 5);

  return { winner, articles, transcripts, related };
}
