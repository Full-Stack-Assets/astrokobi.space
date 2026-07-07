'use client';

import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT as CLIENT } from '@/lib/ads';

/**
 * A single AdSense ad unit. The publisher id is configured by default (see
 * src/lib/ads.ts), so this renders nothing unless a `slot` id is also set — the
 * manual slots stay empty until their ad-unit ids are provided (Auto Ads still
 * works from the site-wide script regardless).
 *
 * Lazy: the adsbygoogle push is deferred until the slot is within ~600px of the
 * viewport (IntersectionObserver), so below-the-fold units don't fetch ads —
 * or compete for bandwidth — during initial page load.
 */
export function AdSlot({
  slot,
  format = 'auto',
  layout,
  className = '',
}: {
  slot?: string;
  format?: string;
  layout?: string;
  className?: string;
}) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT || !slot || pushed.current) return;

    const push = () => {
      if (pushed.current) return;
      pushed.current = true;
      try {
        ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({});
      } catch {
        // AdSense script not ready or blocked — leave the slot empty.
      }
    };

    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      push();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          push();
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [slot]);

  if (!CLIENT || !slot) return null;

  return (
    <ins
      ref={ref}
      className={`adsbygoogle ${className}`}
      style={{ display: 'block' }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
      {...(layout ? { 'data-ad-layout': layout } : {})}
      aria-label="Advertisement"
    />
  );
}
