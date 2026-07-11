import Link from 'next/link';
import type { Metadata } from 'next';
import { siteConfig } from '@/site.config';
import { SITE_URL } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Sponsor',
  description: `Reach an engaged audience of ${siteConfig.audience} on ${siteConfig.name}.`,
};

// Sponsor inquiries go to sponsor@<domain>. Override by editing this line.
const SPONSOR_EMAIL = `sponsor@${(() => {
  try {
    return new URL(SITE_URL || siteConfig.url).host.replace(/^www\./, '');
  } catch {
    return 'example.com';
  }
})()}`;

function Row({ product, detail, price }: { product: string; detail: string; price: string }) {
  return (
    <tr className="border-t border-white/10">
      <td className="py-3 pr-4 align-top font-display font-semibold text-paper">{product}</td>
      <td className="py-3 pr-4 align-top text-sm text-muted">{detail}</td>
      <td className="py-3 align-top text-right font-mono text-sm whitespace-nowrap text-accent">{price}</td>
    </tr>
  );
}

export default function SponsorPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 border-b border-white/15 pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Media kit</div>
        <h1 className="mt-2 font-display text-5xl font-black">Sponsor {siteConfig.name}</h1>
        <p className="mt-4 font-display text-xl leading-snug text-muted">
          Put your brand in front of {siteConfig.audience} — in a clean, single-sponsor
          format that readers actually trust.
        </p>
      </div>

      <div className="prose-editorial">
        <h2>Who reads {siteConfig.name}</h2>
        <p>
          {siteConfig.description} Our readers are {siteConfig.audience} — a high-intent,
          hard-to-reach audience that buys gear, books, software, and experiences in this
          space.
        </p>
        <ul>
          <li><strong>Audience:</strong> {siteConfig.audience}.</li>
          <li><strong>Channels:</strong> the site, a weekly email digest, and social syndication.</li>
          <li><strong>Engagement:</strong> long-form, source-cited articles — readers come to learn, not to bounce.</li>
        </ul>
        <p className="text-sm text-muted">
          Live audience numbers (subscribers, opens, monthly readers) are shared on request
          and refreshed each month — email us for the current one-pager.
        </p>

        <h2>What you can sponsor</h2>
        <ul>
          <li><strong>Weekly newsletter slot</strong> — one sponsor per send, a short
            &ldquo;Presented by&rdquo; block below the intro. One sponsor keeps it clean and high-impact.</li>
          <li><strong>Site placement</strong> — a sponsored gear/recommendation unit or a
            &ldquo;Sponsored by&rdquo; line within relevant articles, sold per month.</li>
          <li><strong>Dedicated email</strong> — an occasional, clearly-labeled standalone send.</li>
        </ul>

        <h2>Starting rates</h2>
        <table className="w-full border-collapse text-left">
          <tbody>
            <Row product="Newsletter slot" detail="one sponsor per weekly send" price="from $40 / send" />
            <Row product="4-week package" detail="four consecutive sends" price="~10–15% off" />
            <Row product="Site placement" detail="sponsored unit, per month" price="from $150 / mo" />
            <Row product="Dedicated email" detail="standalone labeled send" price="2–3× a slot" />
          </tbody>
        </table>
        <p className="text-sm text-muted">
          Rates scale with audience size; ask about the current intro rate for a first,
          no-commitment run. Every placement is clearly labeled and relevant to our
          niche — we don&rsquo;t run off-topic or untrustworthy ads.
        </p>

        <h2>Get in touch</h2>
        <p>
          Email{' '}
          <a className="text-accent underline" href={`mailto:${SPONSOR_EMAIL}?subject=Sponsoring ${siteConfig.name}`}>
            {SPONSOR_EMAIL}
          </a>{' '}
          with your product and the dates you have in mind, and we&rsquo;ll send the current
          audience one-pager and availability.
        </p>

        <p className="mt-8">
          <Link href="/" className="text-accent underline">← Back to the front page</Link>
        </p>
      </div>
    </div>
  );
}
