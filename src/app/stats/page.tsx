import Link from 'next/link';
import { listPosts } from '@/lib/posts';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { TopicLog } from '@/lib/orchestrator/types';
import { siteConfig } from '@/site.config';

export const revalidate = 300;
export const metadata = { title: 'Stats' };

async function loadLog(): Promise<TopicLog> {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), 'content', '.topic-log.json'),
      'utf8'
    );
    return JSON.parse(raw);
  } catch {
    return { topics: [] };
  }
}

export default async function StatsPage() {
  const posts = await listPosts();
  const log = await loadLog();

  const byCat: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  const avgReadTime =
    posts.length > 0
      ? Math.round(posts.reduce((s, p) => s + p.readingTimeMin, 0) / posts.length)
      : 0;

  for (const p of posts) {
    byCat[p.frontmatter.category] = (byCat[p.frontmatter.category] ?? 0) + 1;
    for (const t of p.frontmatter.tags ?? []) {
      byTag[t] = (byTag[t] ?? 0) + 1;
    }
  }

  const topTags = Object.entries(byTag)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Header */}
      <div className="mb-12 border-b border-white/15 pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Meta</div>
        <h1 className="mt-2 font-display text-5xl font-black">Stats</h1>
        <p className="mt-2 text-muted">
          Pipeline telemetry and content breakdown.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-4 mb-16">
        <Stat label="Posts" value={posts.length} />
        <Stat label="Topics logged" value={log.topics.length} />
        <Stat label="Categories" value={Object.keys(byCat).length} />
        <Stat label="Avg read time" value={`${avgReadTime}m`} />
      </div>

      {/* Category breakdown */}
      <section className="mb-16">
        <SectionHeading>Posts by category</SectionHeading>
        <div className="mt-6 space-y-3">
          {Object.entries(byCat)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, n]) => {
              const pct = Math.round((n / posts.length) * 100);
              return (
                <div key={cat} className="flex items-center gap-4">
                  <Link
                    href={`/categories/${cat}`}
                    className="w-28 text-sm font-medium capitalize hover:text-accent transition-colors"
                  >
                    {cat}
                  </Link>
                  <div className="flex-1 h-6 bg-white/[0.05] relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-accent/80"
                      style={{ width: `${pct}%`, minWidth: '1rem' }}
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-mono text-muted">
                      {n} ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Tag cloud */}
      {topTags.length > 0 && (
        <section className="mb-16">
          <SectionHeading>Top tags</SectionHeading>
          <div className="mt-6 flex flex-wrap gap-2">
            {topTags.map(([tag, n]) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="border border-white/20 px-3 py-1.5 text-xs uppercase tracking-widest hover:border-accent hover:text-accent transition-colors"
              >
                #{tag}{' '}
                <span className="font-mono text-muted">{n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Topic log */}
      <section>
        <SectionHeading>Recent topic log</SectionHeading>
        {log.topics.length === 0 ? (
          <p className="mt-4 text-muted">
            No topics logged yet. Run{' '}
            <code className="rounded bg-white/10 px-2 py-0.5 text-sm">
              npm run generate
            </code>{' '}
            to populate.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-ink/10">
            {log.topics
              .slice(-25)
              .reverse()
              .map((t, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <a
                      href={t.url}
                      className="text-sm leading-snug hover:text-accent transition-colors line-clamp-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.title}
                    </a>
                    <div className="mt-0.5 text-[11px] font-mono text-muted truncate">
                      {t.signature.slice(0, 8)}… → /blog/{t.slug}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-muted">
                    {new Date(t.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Back link */}
      <div className="mt-16 border-t border-white/15 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display font-semibold text-accent hover:gap-3 transition-all"
        >
          ← Back to {siteConfig.name}
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass-card p-5">
      <div className="font-display text-3xl font-black text-accent">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="font-display text-xl font-bold shrink-0">{children}</h2>
      <div className="h-px flex-1 bg-white/15" />
    </div>
  );
}
