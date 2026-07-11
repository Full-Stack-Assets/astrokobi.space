import { SubscribeForm } from '@/components/SubscribeForm';
import { siteConfig } from '@/site.config';

/**
 * A self-contained newsletter call-to-action: heading, one-line value prop, and
 * the signup form. Used at the end of every article (see blog/[slug]/page.tsx)
 * and also registered as an MDX component so it can be dropped inline in a post.
 * Reads branding from siteConfig to stay portable.
 */
export function NewsletterCTA({
  heading = `Get the weekly ${siteConfig.tagline.split('·')[0].trim().toLowerCase()} dispatch`,
  blurb = 'The week’s highest-signal stories, synthesized. One email, no spam.',
}: {
  heading?: string;
  blurb?: string;
}) {
  return (
    <aside className="my-12 rounded-xl border border-accent2/40 bg-gradient-to-br from-accent2/10 via-transparent to-accent/10 p-6 backdrop-blur-sm sm:p-8">
      <div className="font-display text-xl font-bold leading-snug text-paper">{heading}</div>
      <p className="mt-1 mb-4 text-sm text-muted">{blurb}</p>
      <SubscribeForm />
    </aside>
  );
}
