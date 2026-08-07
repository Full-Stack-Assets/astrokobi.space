'use client';

export function SubscribeForm() {
  const subscribeUrl = process.env.NEXT_PUBLIC_NEWSLETTER_SUBSCRIBE_URL?.trim();

  if (!subscribeUrl) {
    return <p className="text-sm text-muted">Newsletter signup is being moved to the new static hosting setup.</p>;
  }

  return (
    <a
      href={subscribeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex rounded-md bg-gradient-to-r from-accent2 to-accent px-4 py-2 text-sm font-semibold text-ink transition-[filter,box-shadow] hover:brightness-110 hover:shadow-[0_0_24px_-8px_var(--color-accent)]"
    >
      Subscribe to the newsletter →
    </a>
  );
}
