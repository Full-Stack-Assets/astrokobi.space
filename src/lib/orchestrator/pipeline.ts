import { fetchReddit } from '../sources/reddit';
import { fetchRss } from '../sources/rss';
import { fetchYouTube } from '../sources/youtube';
import { fetchBraveNews } from '../sources/bravenews';
import { fetchGoogleTrends } from '../sources/googletrends';
import { score, dedupe, pickWinner, signature } from './score';
import { research } from './research';
import { generate } from './generate';
import { pickImage } from './image';
import { serialize } from './serialize';
import { loadTopicLog, saveTopicLog, commitPost } from './github';
import type { RawItem, ScoredItem, TopicLog } from './types';

export interface PipelineResult {
  ok: boolean;
  slug?: string;
  path?: string;
  winner?: { title: string; url: string; score: number };
  skipped?: string;
  error?: string;
  timings: Record<string, number>;
}

export interface PipelineOptions {
  /** If true, don't commit to GitHub — return the MDX content instead. */
  dryRun?: boolean;
  /** Override the topic log (useful for local runs). */
  topicLog?: TopicLog;
}

export async function runPipeline(opts: PipelineOptions = {}): Promise<PipelineResult & { mdx?: string }> {
  const timings: Record<string, number> = {};
  const t = (label: string) => {
    const start = Date.now();
    return () => (timings[label] = Date.now() - start);
  };

  try {
    // ── 1. Gather ─────────────────────────────────────────────────
    const doneGather = t('gather');
    const [reddit, rss, yt, brave, trends] = await Promise.all([
      fetchReddit().catch((e) => { console.warn('reddit', e); return [] as RawItem[]; }),
      fetchRss().catch((e) => { console.warn('rss', e); return [] as RawItem[]; }),
      fetchYouTube().catch((e) => { console.warn('yt', e); return [] as RawItem[]; }),
      fetchBraveNews().catch((e) => { console.warn('brave', e); return [] as RawItem[]; }),
      fetchGoogleTrends().catch((e) => { console.warn('googletrends', e); return [] as RawItem[]; }),
    ]);
    // Hacker News and DEV.to are niche-agnostic (general tech-news) sources, so
    // they injected off-niche winners on this niche site. Excluded here so only
    // on-niche stories (Reddit / RSS / Brave / YouTube / Google Trends — all
    // configured for this site's niche in siteConfig.sources) can win.
    const allItems = [...reddit, ...rss, ...yt, ...brave, ...trends];
    doneGather();

    if (allItems.length === 0) {
      return { ok: false, skipped: 'no items from any source', timings };
    }

    // ── 2. Score & pick ───────────────────────────────────────────
    const doneScore = t('score');
    const scored = dedupe(score(allItems));
    const topicLog = opts.topicLog ?? (opts.dryRun ? { topics: [] } : await loadTopicLog());
    // AstroKobi intentionally DISREGARDS the topic log when picking a winner:
    // the log had saturated, starving the hourly run of fresh winners ("no new
    // topic"). Pass an empty log so pickWinner returns the top-scored (still
    // in-run-deduped) candidate regardless of whether it was covered before.
    // The real topicLog is still loaded above and updated/recorded below.
    const winner = pickWinner(scored, { topics: [] });
    doneScore();

    if (!winner) {
      return { ok: false, skipped: 'all top candidates already covered', timings };
    }

    // ── 3. Research ──────────────────────────────────────────────
    const doneResearch = t('research');
    const bundle = await research(winner, allItems);
    doneResearch();

    if (bundle.articles.length === 0 && bundle.transcripts.length === 0) {
      return {
        ok: false,
        skipped: `no research content scrapable for: ${winner.title}`,
        winner: { title: winner.title, url: winner.url, score: winner.score },
        timings,
      };
    }

    // ── 4. Generate ──────────────────────────────────────────────
    const doneGen = t('generate');
    const post = await generate(bundle);
    post.heroImage = await pickImage(post);
    const mdx = serialize(post);
    doneGen();

    if (opts.dryRun) {
      return {
        ok: true,
        slug: post.slug,
        winner: { title: winner.title, url: winner.url, score: winner.score },
        mdx,
        timings,
      };
    }

    // ── 5. Commit ────────────────────────────────────────────────
    const doneCommit = t('commit');
    const path = await commitPost(post, mdx);
    await saveTopicLog({
      topics: [
        ...topicLog.topics,
        {
          slug: post.slug,
          title: winner.title,
          url: winner.url,
          publishedAt: new Date().toISOString(),
          signature: signature(winner.title),
        },
      ],
    });
    doneCommit();

    return {
      ok: true,
      slug: post.slug,
      path,
      winner: { title: winner.title, url: winner.url, score: winner.score },
      timings,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      timings,
    };
  }
}

export interface TopicPipelineOptions {
  /** If true, don't commit to GitHub — return the MDX content instead. */
  dryRun?: boolean;
  /** Frontmatter date for the post (defaults to now). The seed runner spreads
   *  these across recent history to build a believable back catalog. */
  date?: Date;
  /** Forwarded to generate() — see GenerateOptions for both fields. Used by
   *  scripts/backfill-articles.ts to produce long-form, double-length posts. */
  targetWords?: number;
  minBodyChars?: number;
}

/**
 * Generate a single post from an explicit, evergreen topic instead of from live
 * trending sources — the engine behind `scripts/seed.ts`. It skips stages 1–2
 * (gather/score), synthesizes a "winner" from the topic string, and runs the
 * same research → generate → image → serialize path as `runPipeline`, so the
 * output is identical in shape. Needs the LLM key and `BRAVE_API_KEY` (the
 * topic has no source URL of its own, so research relies on web search).
 */
export async function generateForTopic(
  topic: string,
  opts: TopicPipelineOptions = {}
): Promise<PipelineResult & { mdx?: string }> {
  const timings: Record<string, number> = {};
  const t = (label: string) => {
    const start = Date.now();
    return () => (timings[label] = Date.now() - start);
  };

  try {
    const title = topic.trim();
    const when = opts.date ?? new Date();

    // A synthetic winner: no source URL, neutral breakdown. research() will
    // Brave-search the title and scrape real articles to back the post.
    const winner: ScoredItem = {
      id: `seed:${signature(title)}`,
      source: 'bravenews',
      title,
      url: '',
      publishedAt: when.toISOString(),
      score: 1,
      breakdown: { popularity: 0, engagement: 0, recency: 1 },
    };

    const doneResearch = t('research');
    const bundle = await research(winner, []);
    doneResearch();

    if (bundle.articles.length === 0 && bundle.transcripts.length === 0) {
      return { ok: false, skipped: `no research content scrapable for: ${title}`, timings };
    }

    const doneGen = t('generate');
    const post = await generate(bundle, { targetWords: opts.targetWords, minBodyChars: opts.minBodyChars });
    post.heroImage = await pickImage(post);
    const mdx = serialize(post, when);
    doneGen();

    if (opts.dryRun) {
      return { ok: true, slug: post.slug, winner: { title, url: '', score: 1 }, mdx, timings };
    }

    const doneCommit = t('commit');
    const topicLog = await loadTopicLog();
    const path = await commitPost(post, mdx);
    await saveTopicLog({
      topics: [
        ...topicLog.topics,
        { slug: post.slug, title, url: '', publishedAt: when.toISOString(), signature: signature(title) },
      ],
    });
    doneCommit();

    return { ok: true, slug: post.slug, path, winner: { title, url: '', score: 1 }, timings };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), timings };
  }
}
