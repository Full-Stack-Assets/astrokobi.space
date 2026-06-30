#!/usr/bin/env tsx
/**
 * Backfill / refresh hero images for existing posts.
 *
 * Re-runs the pipeline's `pickImage()` for each `content/posts/*.mdx` using the
 * current (content-accurate) query logic and provider chain, then rewrites just
 * the `hero:` frontmatter block in place — the rest of the file (body, sources,
 * dates) is left byte-for-byte unchanged.
 *
 * Usage:
 *   npx tsx scripts/reimage.ts            # re-image every post
 *   npx tsx scripts/reimage.ts --missing  # only posts whose hero.url is empty
 *   npx tsx scripts/reimage.ts --dry      # report only, write nothing
 *
 * Provider/keys come from the environment (PEXELS_API_KEY → Pexels, otherwise
 * the keyless Openverse), exactly like the live pipeline.
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { siteConfig } from '../src/site.config';
import matter from 'gray-matter';
import { pickImage } from '../src/lib/orchestrator/image';
import type { GeneratedPost } from '../src/lib/orchestrator/types';

const POSTS_DIR = path.join(process.cwd(), 'content', siteConfig.contentDirectory);
const DRY = process.argv.includes('--dry');
const ONLY_MISSING = process.argv.includes('--missing');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mirror serialize.ts#quoteIfNeeded so the rewritten block matches the engine.
function q(s: string): string {
  return `"${String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function replaceHero(
  raw: string,
  hero: { url: string; alt: string; credit: string; creditUrl: string }
): string | null {
  const block =
    `hero:\n` +
    `  url: ${q(hero.url)}\n` +
    `  alt: ${q(hero.alt)}\n` +
    `  credit: ${q(hero.credit)}\n` +
    `  creditUrl: ${q(hero.creditUrl)}`;
  // Multiline block (engine output) — allow optional whitespace after `hero:`.
  const multiline = /hero:\s*\n( +)url:[^\n]*\n\1alt:[^\n]*\n\1credit:[^\n]*\n\1creditUrl:[^\n]*/;
  // Inline block (hand-authored posts): hero: { url: "", ... }
  const inline = /hero:\s*\{[^}]*\}/;
  if (multiline.test(raw)) return raw.replace(multiline, block);
  if (inline.test(raw)) return raw.replace(inline, block);
  return null;
}

async function main() {
  const files = (await fs.readdir(POSTS_DIR)).filter((f) => f.endsWith('.mdx')).sort();
  let changed = 0,
    skipped = 0,
    noImage = 0,
    failed = 0;

  for (const file of files) {
    const full = path.join(POSTS_DIR, file);
    const raw = await fs.readFile(full, 'utf8');
    const { data } = matter(raw);
    const slug = file.replace(/\.mdx$/, '');
    const existingUrl: string = data?.hero?.url ?? '';

    if (ONLY_MISSING && existingUrl) {
      skipped++;
      continue;
    }

    const post = {
      title: data.title ?? slug,
      description: data.description ?? '',
      slug,
      category: data.category ?? '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      body: '',
      heroImage: { url: '', alt: '', credit: '', creditUrl: '' },
      sources: [],
    } as unknown as GeneratedPost;

    let hero;
    try {
      hero = await pickImage(post);
    } catch (e) {
      failed++;
      console.warn(`[reimage] ${slug}: pickImage threw — ${e instanceof Error ? e.message : e}`);
      await sleep(250);
      continue;
    }

    if (!hero.url) {
      noImage++;
      console.warn(`[reimage] ${slug}: no image found, left unchanged`);
      await sleep(250);
      continue;
    }

    const next = replaceHero(raw, hero);
    if (next === null) {
      failed++;
      console.warn(`[reimage] ${slug}: could not locate hero block, skipped`);
      continue;
    }
    if (next === raw) {
      skipped++;
      await sleep(250);
      continue;
    }

    if (!DRY) await fs.writeFile(full, next, 'utf8');
    changed++;
    console.log(`[reimage] ${slug}: ${existingUrl ? 'updated' : 'set'} hero`);
    await sleep(250); // be gentle with the image API
  }

  console.log(
    `\n[reimage] done — changed:${changed} skipped:${skipped} no-image:${noImage} failed:${failed} (dry=${DRY})`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
