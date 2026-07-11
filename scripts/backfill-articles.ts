#!/usr/bin/env tsx
/**
 * One-time backfill: 16 evergreen articles, each pinned to a specific
 * historical day in June 2026 so the catalog reads as accumulated history
 * rather than a single-day burst.
 *
 * Each entry uses the same generateForTopic() path as scripts/seed.ts (real
 * Brave-search research + a real LLM author) and the standard post length —
 * this repo's TopicPipelineOptions only supports `dryRun` and `date`. Topics
 * lean into this variant's full beat (Cosmos · Intelligence · Tomorrow):
 * deep space, synthetic intelligence, and long-range futures — the seed list
 * (scripts/seed-topics.ts) already covers pure astronomy, so these fill the
 * intelligence/futures side of the taxonomy.
 *
 * NEVER commits via Octokit: posts are written to the site's content
 * directory (content/<siteConfig.contentDirectory>/, i.e. content/editorial/)
 * and the local content/.topic-log.json is updated, exactly like seed.ts. The
 * companion workflow (.github/workflows/backfill-articles.yml) commits the
 * result. Idempotent — an item whose signature is already in the log is
 * skipped, so a partial/interrupted run can simply be re-dispatched.
 *
 * Requires the writer LLM key (`llm.apiKeyEnv` in site.config.ts) and
 * BRAVE_API_KEY (these topics have no source URL, so research relies on web
 * search). PEXELS_API_KEY is optional (hero images).
 *
 * Usage:
 *   npx tsx scripts/backfill-articles.ts         # run the whole batch
 *   npx tsx scripts/backfill-articles.ts --dry   # research+write the first item, write nothing
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateForTopic } from '../src/lib/orchestrator/pipeline';
import { signature } from '../src/lib/orchestrator/score';
import type { TopicLog } from '../src/lib/orchestrator/types';
import { siteConfig } from '../src/site.config';

const LOG_PATH = path.join(process.cwd(), 'content', '.topic-log.json');
const POSTS_DIR = path.join(process.cwd(), 'content', siteConfig.contentDirectory);

const DELAY_MS = 2000;

interface BackfillItem {
  topic: string;
  date: string; // ISO
}

// Chronological, one per day through June 2026 at 12:00Z. Evergreen
// explainers a curious reader actually searches for, spanning the site's
// three categories: cosmos, intelligence, futures.
const BACKFILL_ITEMS: BackfillItem[] = [
  { topic: 'How large language models actually work, explained without the math', date: '2026-06-02T12:00:00.000Z' },
  { topic: 'The AI alignment problem: why getting machines to want what we want is hard', date: '2026-06-03T12:00:00.000Z' },
  { topic: 'Machine learning in astronomy: how AI finds exoplanets and supernovae in the noise', date: '2026-06-04T12:00:00.000Z' },
  { topic: 'Could a machine ever be conscious? What science can and cannot say', date: '2026-06-05T12:00:00.000Z' },
  { topic: 'Neuromorphic computing: chips built to work like the brain', date: '2026-06-06T12:00:00.000Z' },
  { topic: 'Technosignatures: searching for alien technology instead of alien biology', date: '2026-06-07T12:00:00.000Z' },
  { topic: 'How autonomous spacecraft think: onboard AI for missions light-minutes from Earth', date: '2026-06-08T12:00:00.000Z' },
  { topic: 'The simulation hypothesis: could our universe be a computation', date: '2026-06-09T12:00:00.000Z' },
  { topic: 'Mind uploading and whole brain emulation: the physics and the philosophy', date: '2026-06-10T12:00:00.000Z' },
  { topic: 'Quantum computers: what they will and will not change', date: '2026-06-11T12:00:00.000Z' },
  { topic: 'Interstellar communication: how humanity could talk across light-years', date: '2026-06-12T12:00:00.000Z' },
  { topic: 'The far future of the universe: from the last stars to the heat death', date: '2026-06-13T12:00:00.000Z' },
  { topic: 'Long-term thinking: why civilizations need 10,000-year plans', date: '2026-06-14T12:00:00.000Z' },
  { topic: 'How to store knowledge for a million years: archives built for deep time', date: '2026-06-15T12:00:00.000Z' },
  { topic: 'Swarm robotics and the future of planetary exploration', date: '2026-06-16T12:00:00.000Z' },
  { topic: 'Artificial general intelligence: how we would know when we crossed the line', date: '2026-06-17T12:00:00.000Z' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadLocalLog(): Promise<TopicLog> {
  try {
    return JSON.parse(await fs.readFile(LOG_PATH, 'utf8')) as TopicLog;
  } catch {
    return { topics: [] };
  }
}

async function saveLocalLog(log: TopicLog): Promise<void> {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

async function main() {
  const dryRun = process.argv.includes('--dry');

  const llmKeyEnv = siteConfig.llm.apiKeyEnv;
  if (!process.env[llmKeyEnv]?.trim()) {
    console.error(`✗ ${llmKeyEnv} is not set — it's required to write posts. See .env.example.`);
    process.exit(1);
  }
  if (!process.env.BRAVE_API_KEY?.trim()) {
    console.error(
      '✗ BRAVE_API_KEY is not set. These topics have no source URL of their own, ' +
        'so without web search there is nothing to research — every item would be skipped.'
    );
    process.exit(1);
  }

  let log = await loadLocalLog();
  const covered = new Set(log.topics.map((t) => t.signature));
  const queue = BACKFILL_ITEMS.filter((item) => !covered.has(signature(item.topic)));

  console.log(
    `→ ${BACKFILL_ITEMS.length} items in batch, ${queue.length} not yet covered.\n` +
      `→ ${dryRun ? 'DRY RUN (1 item, nothing written)' : `generating ${queue.length}`}…\n`
  );

  if (dryRun) {
    const item = queue[0] ?? BACKFILL_ITEMS[0];
    console.log(`Topic: ${item.topic}\nDate: ${item.date}\n`);
    const res = await generateForTopic(item.topic, {
      dryRun: true,
      date: new Date(item.date),
    });
    console.log(JSON.stringify({ ...res, mdx: res.mdx ? `[${res.mdx.length} bytes]` : undefined }, null, 2));
    if (res.mdx) {
      console.log('\n─── MDX preview (first 2000 chars) ───');
      console.log(res.mdx.slice(0, 2000));
    }
    return;
  }

  await fs.mkdir(POSTS_DIR, { recursive: true });
  let written = 0;
  let skipped = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    process.stdout.write(`[${i + 1}/${queue.length}] ${item.date.slice(0, 10)} — ${item.topic} … `);

    const res = await generateForTopic(item.topic, {
      dryRun: true,
      date: new Date(item.date),
    });

    if (!res.ok || !res.slug || !res.mdx) {
      console.log(`skip (${res.skipped ?? res.error ?? 'unknown'})`);
      skipped++;
      if (DELAY_MS > 0) await sleep(DELAY_MS);
      continue;
    }

    await fs.writeFile(path.join(POSTS_DIR, `${res.slug}.mdx`), res.mdx, 'utf8');
    log = {
      topics: [
        ...log.topics,
        {
          slug: res.slug,
          title: item.topic,
          url: '',
          publishedAt: item.date,
          signature: signature(item.topic),
        },
      ],
    };
    await saveLocalLog(log); // save after each so an interrupted run is resumable
    written++;
    console.log(`✓ ${res.slug} (${res.mdx.length} bytes)`);

    if (DELAY_MS > 0 && i < queue.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n✓ Done. Wrote ${written} post(s), skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
