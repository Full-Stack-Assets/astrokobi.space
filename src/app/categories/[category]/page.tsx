import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPosts } from '@/lib/posts';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await listPosts();
  const cats = Array.from(new Set(posts.map((p) => p.frontmatter.category)));
  return cats.map((category) => ({ category }));
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const posts = (await listPosts()).filter((p) => p.frontmatter.category === category);
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="relative mb-12 border-b border-white/15 pb-6">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="eyebrow text-accent">Frequency · Category</div>
        <h1 className="gradient-text mt-3 font-display text-5xl font-semibold capitalize tracking-[-.03em] sm:text-6xl">{category}</h1>
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
