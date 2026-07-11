'use client';

import { useState } from 'react';

type Status = 'idle' | 'loading' | 'ok' | 'error';

export function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot — must stay empty for humans
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, company }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('ok');
        setMessage('You’re in. Watch your inbox.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data?.error ?? 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  if (status === 'ok') {
    return <p className="text-sm font-medium text-accent">{message}</p>;
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        {/* Honeypot — hidden from humans, off the tab order; bots fill it. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-md border border-white/20 bg-white/[0.04] px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-accent2 focus:shadow-[0_0_18px_-6px_var(--color-accent-two)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-md bg-gradient-to-r from-accent2 to-accent px-4 py-2 text-sm font-semibold text-ink transition-[filter,box-shadow] hover:brightness-110 hover:shadow-[0_0_24px_-8px_var(--color-accent)] disabled:opacity-60"
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {status === 'error' && <p className="mt-2 text-xs text-muted">{message}</p>}
    </div>
  );
}
