import { z } from 'zod';
import type { ResearchBundle, GeneratedPost } from './types';
import { siteConfig } from '@/site.config';

type LlmProvider = { endpoint: string; model: string; apiKeyEnv: string };

// Primary writer model, plus an optional backup provider used when the primary
// keeps returning transient availability errors (5xx / rate limit). The backup
// is configured as `llmFallback` in site.config.ts; skipped when absent or when
// its API key isn't set.
const PRIMARY_LLM: LlmProvider = siteConfig.llm;
const FALLBACK_LLM: LlmProvider | undefined = (siteConfig as { llmFallback?: LlmProvider }).llmFallback;

/** A transient provider error worth failing over to the backup LLM for. */
function isAvailabilityError(msg: string): boolean {
  return /API error (?:429|5\d\d)\b/.test(msg) || /overloaded|unavailable|high demand/i.test(msg);
}

/** How many times to ask the model before giving up on a structurally valid post. */
const MAX_GENERATION_ATTEMPTS = 5;

/** HTTP statuses worth retrying — rate limits and transient upstream outages
 *  (Gemini's free tier returns 503 "UNAVAILABLE" under load). Client errors like
 *  400/401/403 are deliberately absent: retrying them just fails identically. */
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

/** Carries the HTTP status of a failed LLM call so the retry loop can tell a
 *  transient outage (back off and retry) from a fatal client error (give up). */
class LlmError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'LlmError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Worth another try? Only an LlmError is — a retryable HTTP status, or a
 *  network/bad-response failure (an LlmError with no status). Anything that is
 *  NOT an LlmError is an unexpected bug (a TypeError, a misconfiguration); fail
 *  fast on it rather than mask it behind retries and backoff. */
function isTransient(err: unknown): boolean {
  if (!(err instanceof LlmError)) return false;
  return err.status === undefined || RETRYABLE_STATUS.has(err.status);
}

/** Exponential backoff with jitter: ~1s, 2s, 4s, 8s … capped at 30s. Spreads the
 *  retries across a demand spike instead of hammering the same overloaded model. */
function backoffMs(attempt: number): number {
  const base = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
  return base + Math.floor(Math.random() * 500);
}

/**
 * Collapse whitespace and truncate to at most `max` chars at a word boundary,
 * appending an ellipsis. Used as a schema transform so an over-long field is
 * healed in place instead of throwing — the LLM reliably overshoots length
 * caps, and one overshoot must never kill the run after research has succeeded.
 */
export function clampMeta(s: string, max = 200): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 0 ? cut.slice(0, sp) : cut).trimEnd() + '…';
}

/** Coerce any string into a kebab-case slug matching /^[a-z0-9-]+$/. */
export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Lowercase, trim, drop blanks/duplicates, and cap at 6. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && !seen.has(t) && (seen.add(t), true))
    .slice(0, 6);
}

// Self-healing contract. Length/shape overshoots that can be safely coerced are
// repaired by transforms (so a too-long description or a messy slug never throws
// — note `.max()` would fire *before* a transform, so it's deliberately gone).
// Constraints that can't be met without inventing content (a too-short body, or
// fewer than two real tags) still fail and drive a retry rather than be faked.
export const PostSchema = z.object({
  title: z.string().min(20).transform((s) => clampMeta(s, 120)),
  description: z.string().min(1).transform((s) => clampMeta(s)),
  slug: z.string().transform(slugify).pipe(z.string().regex(/^[a-z0-9-]+$/)),
  category: z.string().transform((s) => s.trim().toLowerCase()),
  tags: z
    .array(z.string())
    .transform(normalizeTags)
    .pipe(z.array(z.string()).min(2).max(6)),
  body: z.string().min(800),
});

const SYSTEM_PROMPT = `You are a senior writer producing a single blog post in MDX format for ${siteConfig.audience}.

Your output MUST be a valid JSON object with exactly these fields — nothing else, no prose, no code fences:
{
  "title": string,                // 60-100 chars, specific and concrete, no clickbait
  "description": string,          // SEO meta description, 1-2 sentences, at most 150 chars
  "slug": string,                 // kebab-case, <= 60 chars
  "category": string,             // one of: ${siteConfig.categories.map((c) => `"${c}"`).join(', ')}
  "tags": string[],               // 2-6 lowercase tags
  "body": string                  // MDX body (see structural rules below)
}

BODY STRUCTURE (mandatory, in this order):

1. Opening paragraph (3-5 sentences) — hook + what happened + why it matters. No heading.

2. <Callout type="takeaway"> … </Callout> — a single sentence synthesizing the core point.

3. ## What happened
   Two or three tight paragraphs of factual reporting from the research.

4. ## Why it matters
   Analysis — stakes, implications, who's affected.

5. <ProsCons>
     <Pros>
       <li>…</li>
       <li>…</li>
       <li>…</li>
     </Pros>
     <Cons>
       <li>…</li>
       <li>…</li>
       <li>…</li>
     </Cons>
   </ProsCons>

6. ## How to think about it
   Practical guidance or a framework. Prose only.

7. <Callout type="warning"> … </Callout> — IF there are meaningful caveats, risks, or things the reader should NOT do. Omit this block if nothing warrants a warning.

8. ## FAQ
   <FAQ>
     <Question q="…">Answer paragraph.</Question>
     <Question q="…">Answer paragraph.</Question>
     <Question q="…">Answer paragraph.</Question>
   </FAQ>
   Exactly 3 questions, each a real question a reader would ask.

HARD RULES:
- Write the SEO meta description as 1-2 sentences, at most 150 characters. Do not exceed 150 characters.
- Never invent quotes or attribute statements to people.
- Never invent specific numbers. If you cite a number, it must appear in the research.
- Do not paraphrase any single source closely — synthesize across sources.
- No filler like "in today's fast-paced world" or "in conclusion".
- No emoji.
- American English.
- Do not wrap the JSON in markdown code fences.`;

export interface GenerateOptions {
  /** Guidance embedded in the prompt: the approximate word count to aim for
   *  (e.g. for a long-form/double-length feature). Omit for the standard body. */
  targetWords?: number;
  /** Runtime floor for the body's character count, overriding PostSchema's
   *  default min(800) for this call only — lets a long-form batch enforce a
   *  meaningfully longer body without changing the standard contract used by
   *  the hourly pipeline and the regular seed runner. */
  minBodyChars?: number;
}

export async function generate(
  bundle: ResearchBundle,
  opts: GenerateOptions = {}
): Promise<GeneratedPost> {
  const primaryKey = process.env[PRIMARY_LLM.apiKeyEnv];
  if (!primaryKey) throw new Error(`${PRIMARY_LLM.apiKeyEnv} not set`);
  const fallbackKey = FALLBACK_LLM ? (process.env[FALLBACK_LLM.apiKeyEnv] ?? '').trim() : '';

  // Start on the primary provider; fail over to the backup on transient errors.
  let provider = PRIMARY_LLM;
  let providerKey = primaryKey;
  let failedOver = false;

  const baseUserPrompt = buildUserPrompt(bundle, opts.targetWords);
  const schema = opts.minBodyChars
    ? PostSchema.extend({ body: z.string().min(opts.minBodyChars) })
    : PostSchema;
  let lastError = '';

  // PostSchema heals the clampable overshoots on its own. Retry only covers the
  // genuinely unrepairable misses (too-short body, too-few tags, malformed JSON)
  // and transient LLM errors, feeding the exact reason back so the model can
  // correct itself. Only fail loudly after exhausting attempts.
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const userPrompt =
      attempt === 1
        ? baseUserPrompt
        : `${baseUserPrompt}\n\nYour previous response was rejected: ${lastError}\nReturn a corrected JSON object that satisfies every constraint exactly.`;

    let content: string;
    try {
      content = await callLlm(provider, providerKey, userPrompt);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // A non-retryable client error (400/401/403) or an unexpected bug fails
      // identically every time — surface it now with an accurate message instead
      // of burning the remaining attempts and reporting a misleading "after N
      // attempts". Transient 429/5xx and network blips fall through to a backoff
      // so the next try lands after the demand spike rather than during it.
      if (!isTransient(err)) {
        throw new Error(`LLM generation aborted on a non-retryable error: ${lastError}`);
      }
      if (attempt < MAX_GENERATION_ATTEMPTS) {
        const wait = backoffMs(attempt);
        console.warn(
          `[generate] attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} failed: ${lastError.slice(0, 140)} — retrying in ${wait}ms`
        );
        await sleep(wait);
      }
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      lastError = 'response was not valid JSON';
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) {
      // A response truncated at the token cap (cut off mid-FAQ) leaves an
      // unclosed <Question>/<FAQ> that passes the length-only schema but then
      // crashes `next build` during MDX prerender. Reject and regenerate.
      const unbalanced = findUnbalancedMdxTag(result.data.body);
      if (unbalanced) {
        lastError = `body has an unbalanced MDX tag: ${unbalanced} (likely a truncated response)`;
        continue;
      }
      return finalize(result.data, bundle);
    }
    lastError = result.error.issues
      .map((i) => `${i.path.join('.') || 'root'} — ${i.message}`)
      .join('; ');
  }

  throw new Error(
    `LLM generation failed after ${MAX_GENERATION_ATTEMPTS} attempts: ${lastError}`
  );
}

async function callLlm(provider: LlmProvider, key: string, userPrompt: string): Promise<string> {
  let res: Response;
  try {
    res = await fetchLlm(provider, key, userPrompt);
  } catch (err) {
    // Network-level failure (DNS, reset, timeout) — no HTTP status, so transient.
    throw new LlmError(`LLM request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new LlmError(`LLM API error ${res.status}: ${text.slice(0, 500)}`, res.status);
  }

  let json: { choices: Array<{ message: { content: string } }> };
  try {
    json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  } catch (err) {
    // A malformed body from an otherwise-OK response is an upstream hiccup, not
    // our bug — keep it transient (no status) so it retries.
    throw new LlmError(`LLM returned a non-JSON response: ${err instanceof Error ? err.message : String(err)}`);
  }
  return json.choices?.[0]?.message?.content ?? '';
}

function fetchLlm(provider: LlmProvider, key: string, userPrompt: string): Promise<Response> {
  return fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.5,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
}

// The MDX block components must each be balanced (every open tag closed). A
// truncated LLM response — cut off at the token cap mid-FAQ — leaves an unclosed
// <Question>/<FAQ> that passes the length-only schema but then crashes
// `next build` during MDX prerender. Returns the offending tag, or null if balanced.
const MDX_BLOCK_TAGS = ['Callout', 'ProsCons', 'Pros', 'Cons', 'FAQ', 'Question'] as const;
export function findUnbalancedMdxTag(body: string): string | null {
  for (const tag of MDX_BLOCK_TAGS) {
    const opens = (body.match(new RegExp(`<${tag}(?:\\s|>)`, 'g')) ?? []).length;
    const closes = (body.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
    if (opens !== closes) return `${tag} (${opens} open, ${closes} close)`;
  }
  return null;
}

function finalize(validated: z.infer<typeof PostSchema>, bundle: ResearchBundle): GeneratedPost {
  const sources = [
    { title: bundle.winner.title, url: bundle.winner.url },
    ...bundle.articles.map((a) => ({ title: a.title, url: a.url })),
    ...bundle.transcripts.map((t) => ({
      title: `${t.title} (video)`,
      url: `https://www.youtube.com/watch?v=${t.videoId}`,
    })),
  ].filter((s) => s.url.trim().length > 0); // drop sourceless entries (e.g. an evergreen seed topic has no winner URL)

  return {
    ...validated,
    heroImage: { url: '', alt: '', credit: '', creditUrl: '' }, // populated by image stage
    sources,
  };
}

function buildUserPrompt(bundle: ResearchBundle, targetWords?: number): string {
  const { winner, articles, transcripts, related } = bundle;

  const lengthBlock = targetWords
    ? `\n\n## Length requirement\nThis is a long-form, in-depth feature — write a substantially longer and more detailed body than usual. Target approximately ${targetWords} words total (roughly double the normal length): go deeper in "What happened" and "Why it matters", broaden the pros/cons with more items, and make "How to think about it" more thorough with concrete detail. Do not pad with repetition, filler, or invented content — every added sentence must be substantive and grounded in the research provided.`
    : '';

  const articleBlock = articles
    .map(
      (a, i) => `### Source ${i + 1}: ${a.title}
URL: ${a.url}
${a.content.slice(0, 4000)}`
    )
    .join('\n\n');

  const transcriptBlock = transcripts.length
    ? '\n\n## Video transcripts\n' +
      transcripts
        .map((t) => `### ${t.title}\n${t.text.slice(0, 3000)}`)
        .join('\n\n')
    : '';

  const relatedBlock = related.length
    ? '\n\n## Related headlines (for context only, do not quote)\n' +
      related.map((r) => `- ${r.title} (${r.source})`).join('\n')
    : '';

  return `# Topic
**Winner headline**: ${winner.title}
**Source**: ${winner.source}
**URL**: ${winner.url}
**Published**: ${winner.publishedAt}

## Primary research
${articleBlock}
${transcriptBlock}
${relatedBlock}
${lengthBlock}

Produce the JSON object now.`;
}
