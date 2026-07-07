import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import type { Metadata } from 'next';
import { loadPost, listPosts, relatedPosts } from '@/lib/posts';
import { mdxComponents } from '@/components/mdx';
import { articleJsonLd, faqJsonLd, breadcrumbJsonLd, SITE_URL, SITE_NAME } from '@/lib/structured-data';
import { AdSlot } from '@/components/AdSlot';
import { NewsletterCTA } from '@/components/NewsletterCTA';
import { ADSENSE_CLIENT, ADSENSE_SLOT_IN_ARTICLE, ADSENSE_SLOT_MID_ARTICLE } from '@/lib/ads';
import { SignalVisual } from '@/components/SignalVisual';

/**
 * Split the MDX body at the top-level "## How to think about it" heading so a
 * mid-article ad can sit between two independently-compilable halves (the MDX
 * contract guarantees every component opened before that heading is closed
 * before it). Hand-written editorial posts without the heading — or deploys
 * with no mid-article slot configured — render the body in one piece.
 */
function splitForMidArticleAd(body: string): [string] | [string, string] {
  if (!ADSENSE_CLIENT || !ADSENSE_SLOT_MID_ARTICLE) return [body];
  const m = body.match(/^## How to think about it\s*$/m);
  if (!m || m.index === undefined || m.index === 0) return [body];
  return [body.slice(0, m.index), body.slice(m.index)];
}

export const revalidate = 300;

export async function generateStaticParams() {
  // Only pre-render published posts; a future-dated (scheduled) post is rendered
  // on demand once its time has passed.
  const posts = await listPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: 'Not found' };

  const { title, description, hero, date, category, tags } = post.frontmatter;
  const url = `${SITE_URL}/blog/${slug}`;
  const images = hero?.url ? [hero.url] : [];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      images,
      publishedTime: new Date(date).toISOString(),
      authors: [SITE_NAME],
      section: category,
      tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  // Scheduled posts are not published (even by direct URL) until their date.
  if (new Date(post.frontmatter.date).getTime() > Date.now()) notFound();

  const { frontmatter, body, readingTimeMin } = post;
  const date = new Date(frontmatter.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const article = articleJsonLd(post);
  const faq = faqJsonLd(post);
  const breadcrumb = breadcrumbJsonLd(post);
  const related = relatedPosts(post, await listPosts());

  return (
    <article className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-24">
      {/* Structured data — escape `<` so post content can't break out of the script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article).replace(/</g, '\\u003c') }}
      />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }}
      />

      {/* Article header */}
      <header className="mb-12 max-w-3xl">
        <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted">
          <Link href={`/categories/${frontmatter.category}`} className="border border-accent px-2 py-0.5 text-accent hover:bg-accent hover:text-paper transition-colors">
            {frontmatter.category}
          </Link>
          <span>{date}</span>
          <span>·</span>
          <span>{readingTimeMin} min read</span>
        </div>
        <h1 className="font-display text-5xl font-medium leading-[.94] tracking-[-.05em] sm:text-7xl">
          {frontmatter.title}
        </h1>
        <p className="mt-7 text-lg leading-relaxed text-muted sm:text-xl">
          {frontmatter.description}
        </p>
      </header>

      {/* Hero */}
      <div className="mb-14 aspect-[16/8] overflow-hidden border border-white/15">
        <SignalVisual category={frontmatter.category} index={frontmatter.title.length % 7} compact />
      </div>

      {/* Body — optionally split around a mid-article ad unit */}
      {(() => {
        const parts = splitForMidArticleAd(body);
        return (
          <>
            <div className="prose-editorial">
              <MDXRemote source={parts[0]} components={mdxComponents} />
            </div>
            {parts.length === 2 && (
              <>
                <AdSlot
                  slot={ADSENSE_SLOT_MID_ARTICLE}
                  format="fluid"
                  layout="in-article"
                  className="my-10 block text-center"
                />
                <div className="prose-editorial">
                  <MDXRemote source={parts[1]} components={mdxComponents} />
                </div>
              </>
            )}
          </>
        );
      })()}

      {/* In-article ad (renders only when AdSense is configured) */}
      <AdSlot
        slot={ADSENSE_SLOT_IN_ARTICLE}
        format="fluid"
        layout="in-article"
        className="my-12 block text-center"
      />

      {/* End-of-article newsletter CTA */}
      <NewsletterCTA />

      {/* Sources */}
      {frontmatter.sources?.length > 0 && (
        <section className="mt-16 border-t-2 border-ink pt-8">
          <div className="mb-4 font-display text-sm font-bold uppercase tracking-[0.3em] text-muted">
            Sources
          </div>
          <ol className="space-y-2 text-sm">
            {frontmatter.sources.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-accent">{String(i + 1).padStart(2, '0')}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent break-all">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Tags */}
      {frontmatter.tags?.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2">
          {frontmatter.tags.map((t) => (
            <Link key={t} href={`/tags/${t}`} className="border border-ink/30 px-2 py-1 text-[11px] uppercase tracking-widest text-ink/70 hover:border-accent hover:text-accent transition-colors">
              #{t}
            </Link>
          ))}
        </div>
      )}

      {/* Keep reading — internal links to related posts */}
      {related.length > 0 && (
        <section className="mt-16 border-t-2 border-ink pt-8">
          <div className="mb-6 font-display text-sm font-bold uppercase tracking-[0.3em] text-muted">
            Keep reading
          </div>
          <ul className="space-y-6">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group block">
                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted">
                    <span className="text-accent">{p.frontmatter.category}</span>
                    <span>·</span>
                    <span>{p.readingTimeMin} min read</span>
                  </div>
                  <div className="mt-1 font-display text-xl font-bold leading-snug group-hover:text-accent transition-colors">
                    {p.frontmatter.title}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70 line-clamp-2">
                    {p.frontmatter.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Back link */}
      <div className="mt-16 border-t border-ink/20 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 font-display font-semibold text-accent hover:gap-3 transition-all">
          ← Back to {SITE_NAME}
        </Link>
      </div>
    </article>
  );
}
