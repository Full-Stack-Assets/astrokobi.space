import Link from 'next/link';
import { siteConfig } from '@/site.config';

export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="relative mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="aurora aurora--soft" aria-hidden />
      <div className="eyebrow text-accent">About the journal</div>
      <h1 className="mt-6 max-w-3xl font-display text-5xl font-medium leading-[.92] tracking-[-.05em] sm:text-7xl">
        Curiosity needs a <span className="gradient-text">longer horizon.</span>
      </h1>
      <div className="mt-16 grid gap-12 border-t border-white/15 pt-10 md:grid-cols-[1fr_2fr]">
        <div className="font-mono text-[10px] uppercase leading-loose tracking-[.2em] text-muted">
          <div>Publication / 001</div><div>Frequency / Variable</div><div>Coordinates / Earth</div>
        </div>
        <div className="prose-editorial">
          <p><strong>{siteConfig.name}</strong> is an independent publication about three forces reshaping our sense of what is possible: the cosmos above us, the intelligence emerging around us, and the futures forming where those stories meet.</p>
          <h2>What we publish</h2>
          <p>We write essays, explainers, and thought experiments. The goal is not to chase every launch or model release. It is to find the durable idea underneath the news—the question that will still matter after the timeline moves on.</p>
          <h2>Our point of view</h2>
          <p>Technology is neither destiny nor decoration. Space is not an empty stage, and artificial intelligence is not a magic trick. Both are systems with politics, limits, costs, and astonishing creative potential. We approach them with informed optimism and useful skepticism.</p>
          <h2>Editorial method</h2>
          <p>Articles may use computational tools during research and drafting, but publication remains an editorial act. Claims should be traceable, uncertainty should be visible, and clean prose should never disguise a weak idea.</p>
          <p><Link href="/" className="text-accent">← Return to the archive</Link></p>
        </div>
      </div>
    </div>
  );
}
