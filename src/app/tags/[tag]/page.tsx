import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPosts } from '@/lib/posts';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await listPosts();
  const tags = Array.from(new Set(posts.flatMap((p) => p.frontmatter.tags ?? [])));
  return tags.map((tag) => ({ tag }));
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const posts = (await listPosts()).filter((p) => p.frontmatter.tags?.includes(tag));
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="relative mb-12 border-b border-white/15 pb-6">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="eyebrow text-accent">Index · Tag</div>
        <h1 className="gradient-text mt-3 font-display text-5xl font-semibold tracking-[-.03em] sm:text-6xl">#{tag}</h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{posts.length} {posts.length === 1 ? 'signal' : 'signals'} on record</p>
      </div>
      <ul className="divide-y divide-white/10">
        {posts.map((p) => (
          <li key={p.slug} className="py-6">
            <Link href={`/blog/${p.slug}`} className="group block">
              <h2 className="font-display text-2xl font-semibold group-hover:text-accent transition-colors">
                {p.frontmatter.title}
              </h2>
              <p className="mt-1 text-muted">{p.frontmatter.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
