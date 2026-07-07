import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/posts';
import { SITE_NAME } from '@/lib/structured-data';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await listPosts();
  const tags = Array.from(new Set(posts.flatMap((p) => p.frontmatter.tags ?? [])));
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const title = `#${tag}`;
  const description = `Everything ${SITE_NAME} has published under #${tag}.`;
  return {
    title,
    description,
    alternates: { canonical: `/tags/${tag}` },
    openGraph: { title, description, url: `/tags/${tag}` },
    twitter: { card: 'summary', title, description },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const posts = (await listPosts()).filter((p) => p.frontmatter.tags?.includes(tag));
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Tag</div>
        <h1 className="mt-2 font-display text-5xl font-black">#{tag}</h1>
        <p className="mt-2 text-muted">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
      </div>
      <ul className="divide-y divide-ink/20">
        {posts.map((p) => (
          <li key={p.slug} className="py-6">
            <Link href={`/blog/${p.slug}`} className="group block">
              <h2 className="font-display text-2xl font-semibold group-hover:text-accent transition-colors">
                {p.frontmatter.title}
              </h2>
              <p className="mt-1 text-ink/70">{p.frontmatter.description}</p>
            </Link>
            <div className="mt-2 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
              <Link href={`/categories/${p.frontmatter.category}`} className="text-accent hover:underline">
                {p.frontmatter.category}
              </Link>
              <span>{new Date(p.frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span>· {p.readingTimeMin} min</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
