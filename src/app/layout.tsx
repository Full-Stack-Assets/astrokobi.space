import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { Fraunces, Inter, Space_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, websiteJsonLd } from '@/lib/structured-data';
import { SubscribeForm } from '@/components/SubscribeForm';
import { AdSlot } from '@/components/AdSlot';
import { AffiliateDisclosure } from '@/components/mdx';
import { ADSENSE_CLIENT, ADSENSE_SLOT_FOOTER } from '@/lib/ads';
import { siteConfig } from '@/site.config';
import { shouldDisclose } from '@/lib/affiliate';
import './globals.css';

// Self-hosted Google fonts via next/font — no render-blocking CSS @import, no
// external request at runtime. Wired as CSS variables on <html> and consumed by
// Tailwind's font-display/font-body/font-mono and globals.css.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['opsz'],
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

/** Short categories (AI, DIY) read better uppercased; longer ones title-cased. */
function navLabel(c: string): string {
  return c.length <= 3 ? c.toUpperCase() : c[0].toUpperCase() + c.slice(1);
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': `${SITE_URL}/feed.xml` },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  // Static AdSense site-verification tag in <head> — crawlable without JS.
  other: { 'google-adsense-account': ADSENSE_CLIENT },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-site={siteConfig.key}
      className={`${fraunces.variable} ${inter.variable} ${spaceMono.variable}`}
    >
      <body className="relative overflow-x-hidden">
        {ADSENSE_CLIENT && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()).replace(/</g, '\\u003c') }}
        />
        <Header />
        <main className="relative z-10">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

function Header() {
  const words = siteConfig.name.split(' ');
  const last = words.pop();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/60 backdrop-blur-xl supports-[backdrop-filter]:bg-ink/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="group">
          <div className="font-display text-xl font-semibold uppercase tracking-[0.12em] leading-none text-paper">{words.join(' ')} <span className="text-accent">{last}</span></div>
        </Link>
        <nav className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:gap-7">
          {siteConfig.navCategories.map((c) => (
            <Link key={c} href={`/categories/${c}`} className="hidden transition-colors hover:text-accent sm:block">{navLabel(c)}</Link>
          ))}
          <Link href="/about" className="transition-colors hover:text-accent">About</Link>
          <a href="/feed.xml" className="rounded-full border border-white/20 px-3.5 py-2 text-paper transition-colors hover:border-accent hover:text-accent">RSS ↗</a>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mt-32 border-t border-white/15">
      <div className="mx-auto max-w-7xl px-5 py-12 text-sm text-muted sm:px-8">
        <AdSlot slot={ADSENSE_SLOT_FOOTER} format="auto" className="mb-8 block" />
        <div className="mb-10 flex flex-col gap-5 border-b border-white/10 pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md">
            <div className="eyebrow text-accent">The weekly transmission</div>
            <p className="mt-3 max-w-md font-display text-2xl leading-tight text-paper">One sharp idea from beyond the known. No feed-filler.</p>
          </div>
          <SubscribeForm />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-display text-base font-semibold tracking-widest text-paper">{siteConfig.name}</span>
            {' '}— {siteConfig.footerNote}
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <nav className="flex gap-4 text-xs uppercase tracking-widest">
              <Link href="/about" className="hover:text-accent">About</Link>
              <Link href="/feed.xml" className="hover:text-accent">RSS</Link>
            </nav>
            <div className="text-xs uppercase tracking-widest">
              © {new Date().getFullYear()} — Independent and future-facing.
            </div>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted/80">
          Editorial standards: {siteConfig.name}&rsquo;s articles are researched and drafted with
          AI and published under human editorial oversight. A human operator curates the
          publication, is accountable for what appears here, and reviews and corrects content;
          source links accompany reported claims where applicable. Spotted a mistake?{' '}
          <Link href="/about" className="underline hover:text-accent">Read how this works</Link> —
          corrections are welcome.
        </p>
        {shouldDisclose() && (
          <div className="mt-4 max-w-3xl border-t border-white/10 pt-4">
            <AffiliateDisclosure scope="site" />
          </div>
        )}
      </div>
    </footer>
  );
}
