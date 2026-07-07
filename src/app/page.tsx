import Link from 'next/link';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/posts';
import { SignalVisual } from '@/components/SignalVisual';
import { AdSlot } from '@/components/AdSlot';
import { ADSENSE_SLOT_LISTING } from '@/lib/ads';
import { siteConfig } from '@/site.config';

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const posts = await listPosts();
  const [lead, ...rest] = posts;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
      <Masthead postCount={posts.length} />
      {posts.length === 0 ? <EmptyState /> : (
        <>
          {lead && <LeadStory post={lead} />}
          {/* Listing ad — renders nothing until AdSense + a listing slot are configured */}
          <AdSlot slot={ADSENSE_SLOT_LISTING} format="auto" className="mt-12 block" />
          {rest.length > 0 && (
            <section className="mt-24">
              <SectionRule label="The field notes" />
              <div className="mt-7 grid border-l border-t border-white/15 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post, index) => <PostCard key={post.slug} post={post} index={index + 1} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Masthead({ postCount }: { postCount: number }) {
  return (
    <section className="mb-14 grid min-h-[46vh] items-end gap-10 border-b border-white/15 pb-12 lg:grid-cols-[1fr_auto]">
      <div className="max-w-5xl">
        <div className="eyebrow">Independent journal · {siteConfig.edition}</div>
        <h1 className="mt-6 font-display text-[clamp(4rem,11vw,9.5rem)] font-semibold leading-[0.78] tracking-[-0.075em]">
          {siteConfig.headlineLead}<br /><span className="gradient-text">{siteConfig.headlineAccent}</span>
        </h1>
        <p className="mt-10 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
          {siteConfig.intro}
        </p>
      </div>
      <div className="hidden w-44 border-l border-white/15 pl-6 font-mono text-[10px] uppercase leading-loose tracking-[0.18em] text-muted lg:block">
        <div className="text-paper">Archive status</div>
        <div>{String(postCount).padStart(2, '0')} signals</div>
        <div>3 frequencies</div>
        <div className="mt-4 flex items-center gap-2 text-accent"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> receiving</div>
      </div>
    </section>
  );
}

function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-5">
      <span className="font-mono text-xs uppercase tracking-[0.28em] text-paper">{label}</span>
      <div className="h-px flex-1 bg-white/15" />
      <span className="font-mono text-[10px] text-muted">↓ 001—∞</span>
    </div>
  );
}

type ListedPost = Awaited<ReturnType<typeof listPosts>>[number];

function LeadStory({ post }: { post: ListedPost }) {
  const { slug, frontmatter, readingTimeMin } = post;
  return (
    <article className="grid overflow-hidden border border-white/15 lg:grid-cols-[1.18fr_0.82fr]">
      <Link href={`/blog/${slug}`} className="min-h-[420px] overflow-hidden border-b border-white/15 lg:border-b-0 lg:border-r">
        <SignalVisual category={frontmatter.category} />
      </Link>
      <div className="flex flex-col justify-center p-7 sm:p-12">
        <Link href={`/categories/${frontmatter.category}`} className="eyebrow mb-6 text-accent">
          Featured signal · {frontmatter.category}
        </Link>
        <Link href={`/blog/${slug}`} className="group">
          <h2 className="font-display text-4xl font-medium leading-[0.98] tracking-[-0.045em] transition-colors group-hover:text-accent sm:text-6xl">{frontmatter.title}</h2>
        </Link>
        <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">{frontmatter.description}</p>
        <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          {formatDate(frontmatter.date)} · {readingTimeMin} min read
        </div>
      </div>
    </article>
  );
}

function PostCard({ post, index }: { post: ListedPost; index: number }) {
  const { slug, frontmatter, readingTimeMin } = post;
  return (
    <article className="group flex flex-col border-b border-r border-white/15 p-5 transition-colors hover:bg-white/[0.025] sm:p-6">
      <Link href={`/blog/${slug}`} className="mb-7 block aspect-[4/3] overflow-hidden">
        <SignalVisual category={frontmatter.category} index={index} compact />
      </Link>
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
        <span>{frontmatter.category}</span><span className="text-muted">{String(index).padStart(2, '0')}</span>
      </div>
      <Link href={`/blog/${slug}`} className="mt-auto">
        <h3 className="font-display text-2xl font-medium leading-[1.05] tracking-[-0.025em] transition-colors group-hover:text-accent">{frontmatter.title}</h3>
      </Link>
      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted">{frontmatter.description}</p>
      <div className="mt-7 border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {formatDate(frontmatter.date)} · {readingTimeMin} min
      </div>
    </article>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function EmptyState() {
  return <div className="border border-dashed border-white/20 py-24 text-center font-display text-3xl">No signals in the archive.</div>;
}
