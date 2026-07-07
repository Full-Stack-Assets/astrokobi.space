import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/posts';
import { SITE_NAME } from '@/lib/structured-data';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await listPosts();
  const cats = Array.from(new Set(posts.map((p) => p.frontmatter.category)));
  return cats.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const title = category[0].toUpperCase() + category.slice(1);
  const description = `The latest ${category} dispatches from ${SITE_NAME}.`;
  return {
    title,
    description,
    alternates: { canonical: `/categories/${category}` },
    openGraph: { title, description, url: `/categories/${category}` },
    twitter: { card: 'summary', title, description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const all = await listPosts();
  const posts = all.filter((p) => p.frontmatter.category === category);
  if (posts.length === 0) notFound();

  // Cross-link the sibling categories that actually have published posts.
  const others = Array.from(new Set(all.map((p) => p.frontmatter.category))).filter(
    (c) => c !== category
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Category</div>
        <h1 className="mt-2 font-display text-5xl font-black capitalize">{category}</h1>
        <p className="mt-2 text-muted">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
        {others.length > 0 && (
          <nav className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-muted">
            <span>Also tuned to:</span>
            {others.map((c) => (
              <Link key={c} href={`/categories/${c}`} className="border border-ink/30 px-2 py-1 capitalize hover:border-accent hover:text-accent transition-colors">
                {c}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <ul className="divide-y divide-ink/20">
        {posts.map((p) => (
          <li key={p.slug} className="py-6">
            <Link href={`/blog/${p.slug}`} className="group block">
              <h2 className="font-display text-2xl font-semibold group-hover:text-accent transition-colors">
                {p.frontmatter.title}
              </h2>
              <p className="mt-1 text-ink/70">{p.frontmatter.description}</p>
              <div className="mt-2 text-xs uppercase tracking-widest text-muted">
                {new Date(p.frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}{p.readingTimeMin} min
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
