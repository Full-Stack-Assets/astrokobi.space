# AstroKobi Network

One codebase powers three independently deployable publications:

| Domain | `NEXT_PUBLIC_SITE_VARIANT` | Focus |
| --- | --- | --- |
| `astrokobi.online` | `astrokobi-online` | AI, live systems, and the near future |
| `astrokobi.site` | `astrokobi-site` | Infrastructure, design, and long-range futures |
| `astrokobi.space` | `astrokobi-space` | Cosmos, intelligence, and off-world civilization |

Each domain repository includes a tracked `.env.production` selecting its site
identity, metadata, accent colors, and editorial collection at build time.

A self-hosted, near-zero-cost space &amp; astronomy blog that writes itself. A scheduled job runs every hour, picks the highest-signal story from seven sources, researches it, writes a structured MDX post, and commits it to GitHub. The Next.js site auto-deploys.

**Stack:** Next.js 15 · TinaCMS · Google Gemini (free tier) · Brave Search · Pexels · GitHub Contents API · Vercel.

**Monthly cost at steady state:** ~$0.

> This site runs a generic, niche-agnostic engine. Everything that makes it *AstroKobi* lives in [`src/site.config.ts`](src/site.config.ts) — branding, audience, categories, and the sources it reads. To spin up a site in a different niche from the same engine, see [`CREATE-A-SITE.md`](CREATE-A-SITE.md).

---

## How it works

```
 ┌─ Reddit ───────┐
 │ Hacker News    │
 │ DEV.to         │──▶ score ──▶ dedup ──▶ winner ──▶ research ──▶ Gemini ──▶ MDX ──▶ git commit ──▶ deploy
 │ RSS feeds      │   (pop + engagement + recency)    (Brave + scrape     (strict JSON
 │ YouTube        │                                    + YT transcripts)   contract)
 │ Brave News     │
 └─ Google Trends ┘
```

Each stage is its own module in `src/lib/orchestrator/` and can be tested independently. The `pipeline.ts` runner wires them together with per-stage timings and graceful fallbacks — a flaky source doesn't kill the run.

The sources are tuned for space and astronomy in `src/site.config.ts`:

- **Subreddits:** r/space, r/astronomy, r/spacex, r/nasa, r/Astrophysics, r/cosmology
- **RSS:** Space.com, NASA, Phys.org (space), Sky &amp; Telescope, Universe Today
- **Brave queries:** "space mission news", "new astronomy discovery", "NASA announcement", "rocket launch", "James Webb telescope"
- **Categories:** news, missions, astronomy, astrophysics, spaceflight, explainers

---

## Setup

### 1. Prereqs

- Node 20+
- npm (the repo ships `package-lock.json`; CI uses `npm ci`)
- A GitHub repo to commit posts into (can be this same repo)

### 2. Install

```bash
npm install
cp .env.example .env.local
```

### 3. Get the free API keys

| Key | Where | Free tier |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | ~1,500 requests/day — comfortably covers an hourly post |
| `BRAVE_API_KEY` | https://api.search.brave.com/app/keys | 2,000 queries/month on the free plan |
| `PEXELS_API_KEY` | https://www.pexels.com/api/new/ | Unlimited for dev use (`imageProvider: 'openverse'` is keyless) |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | https://www.reddit.com/prefs/apps (create a "script" app) | Free |
| `GITHUB_TOKEN` | github.com → Settings → Developer settings → Fine-grained PAT | Scope: **Contents: Read/Write** on the blog repo only |
| `CRON_SECRET` | `openssl rand -hex 32` | — |

Fill them into `.env.local` along with `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH`. Most keys are optional — any unset source is simply skipped. The **LLM key is the only hard requirement**, and its env var name must match `llm.apiKeyEnv` in `src/site.config.ts` (`GEMINI_API_KEY` by default; swap to Groq/OpenRouter via the commented examples in that file).

> **⚠️ Security note:** Never commit `.env.local` or any file containing real API keys. `.env.local` is already in `.gitignore`. Use `.env.example` as a template with placeholder values only. See [`SECURITY_REMEDIATION.md`](SECURITY_REMEDIATION.md).

### 4. Test locally

```bash
# Dry run — prints the generated post, doesn't write anything
npm run generate -- --dry

# Real run — writes MDX to content/posts/ and updates content/.topic-log.json
npm run generate

# Smoke-test every source fetcher against live APIs
npx tsx scripts/smoke-test.ts

# Start the dev server
npm run dev
```

Open http://localhost:3000. The seed post is visible out of the box; new posts show up as soon as `npm run generate` writes them.

### Backfill a starter catalog (optional)

`npm run generate` writes about whatever is *trending right now*, so a fresh site
fills in one post per hour. To stand up a real back catalog immediately, the
**seed runner** generates posts from a curated list of evergreen astronomy
topics (`scripts/seed-topics.ts`) through the exact same write path:

```bash
npm run seed -- --dry          # research + write one topic, print it, write nothing
npm run seed -- --limit=10     # write the first 10 not-yet-covered topics
npm run seed                   # write every not-yet-covered topic
```

It needs `GEMINI_API_KEY` and `BRAVE_API_KEY` (evergreen topics have no source
URL of their own, so research relies on web search). It's idempotent — already
covered topics are skipped via the topic log, so you can stop and re-run — and it
spreads post dates backward over recent days (`--interval-days`) so the catalog
reads as history rather than one burst. Edit `scripts/seed-topics.ts` to change
the list.

---

## Monetization (optional)

Every monetization surface is config-gated: leave a value blank and the surface
renders nothing. All values below are **owner-supplied** — nothing is invented
or defaulted.

| Value | Where to get it | What it turns on |
|---|---|---|
| `NEXT_PUBLIC_ADSENSE_CLIENT` (or `adsenseClient` in `src/site.config.ts`) | [AdSense](https://adsense.google.com) → Account → your `ca-pub-…` id | Loads the AdSense script, serves `/ads.txt`, enables Auto Ads |
| `NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE` | AdSense → Ads → By ad unit (in-article) | Fluid unit after each post body |
| `NEXT_PUBLIC_ADSENSE_SLOT_MID_ARTICLE` | AdSense → Ads → By ad unit (in-article) | Fluid unit between a post's analysis and FAQ sections |
| `NEXT_PUBLIC_ADSENSE_SLOT_LISTING` | AdSense → Ads → By ad unit (display) | Display unit on the homepage below the lead story |
| `NEXT_PUBLIC_ADSENSE_SLOT_FOOTER` | AdSense → Ads → By ad unit (display) | Display unit in the site-wide footer |
| `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` (or `affiliate.amazonTag` in `src/site.config.ts`) | [Amazon Associates](https://affiliate-program.amazon.com) tracking id, e.g. `yoursite-20` | Tags `<GearBox>`/`<GearPick>` links; untagged they stay plain outbound links |
| `BUTTONDOWN_API_KEY` | [Buttondown](https://buttondown.com) → Settings → API | Newsletter signups (article CTA + footer form) and the weekly digest |

Ad slots lazy-load (the ad request fires only when the unit nears the
viewport), affiliate links always carry `rel="sponsored nofollow"` plus the FTC
disclosure, and `/sponsor` is a ready-made media-kit page for direct sponsors.

---

## Deploy

### Scheduling — GitHub Actions (the hourly tick)

The hourly schedule lives in **`.github/workflows/generate.yml`**, which runs at the top of every hour (`cron: '0 * * * *'`), executes the pipeline with `npx tsx scripts/run-local.ts`, and commits any new post straight to the repo. No serverless CPU limits, free logs, and the push triggers your host to redeploy. This is the scheduler — your host below is just for serving the site.

Add the pipeline secrets (`GEMINI_API_KEY`, `BRAVE_API_KEY`, `PEXELS_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) under **Settings → Secrets and variables → Actions**. The workflow has `contents: write` and a `concurrency` group so a slow run never overlaps the next tick, plus a union merge driver (`scripts/merge-topic-log.mjs`) so concurrent appends to the topic log auto-merge instead of conflicting. Use the **Run workflow** button (`workflow_dispatch`) to trigger a one-off run.

> **Why not a Vercel cron?** Vercel's Hobby (free) plan caps cron jobs at **once per day**, so an hourly tick there would be throttled. To stay at $0, scheduling lives in GitHub Actions. On Vercel **Pro** you can instead point an hourly cron at `/api/cron/generate` — the route already handles `Authorization: Bearer $CRON_SECRET`. Don't run both at once or you'll generate twice an hour.

### Hosting — Vercel (easiest)

1. Push this repo to GitHub.
2. Import the repo into Vercel (it auto-detects Next.js; `vercel.json` sets the build command to `npm run build`).
3. Add every env var from `.env.local` to the Vercel project.

Vercel auto-deploys on every push, so each hourly commit from the Action redeploys the site. Optionally set `VERCEL_DEPLOY_HOOK_URL` as an Actions secret to force a redeploy after each post.

### Hosting — Cloudflare Pages (zero-cost route)

Deploy the Next.js blog to Pages purely as the static host — it's free and fast, and it redeploys on each push from the Action. Pages Functions have a **~30s CPU limit per request** and this pipeline runs 30–90s end-to-end, so **don't run the pipeline inside a Pages Function** — let the GitHub Action do the generation.

### Self-host

`npm run build && npm start` and point a reverse proxy at port 3000. The GitHub Action still drives generation; to trigger a run by hand, hit the route with `curl`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/generate
```

---

## TinaCMS editor (optional)

The schema in `tina/config.ts` matches the frontmatter the pipeline emits (and its category dropdown is derived from `src/site.config.ts`, so the two never drift). Start the editor with:

```bash
npm run dev   # Tina runs alongside Next via the `tinacms dev` wrapper
```

Then visit http://localhost:3000/admin/index.html. You can fix typos, tweak tags, or hand-write posts that follow the same structure.

**Self-hosted mode (default):** TinaCMS works in local filesystem mode without any cloud credentials. The build script (`scripts/build.sh`) automatically handles this by skipping the TinaCMS cloud build if credentials aren't provided.

**Hosted editing:** For non-local contributors, sign up at tina.io for the free tier and fill in `NEXT_PUBLIC_TINA_CLIENT_ID` + `TINA_TOKEN` in your deployment environment variables. These are optional for local development.

---

## The MDX contract

Every generated post follows this exact shape — the system prompt in `src/lib/orchestrator/generate.ts` enforces it, and the zod schema validates the JSON before writing:

1. **Lead paragraph** (no heading, 3–5 sentences)
2. `<Callout type="takeaway">` — one-sentence synthesis
3. `## What happened`
4. `## Why it matters`
5. `<ProsCons>` block with 3+ items per side
6. `## How to think about it`
7. `<Callout type="warning">` — *optional*, only if warranted
8. `## FAQ` with exactly 3 `<Question>` entries

All components are implemented in `src/components/mdx/index.tsx` and styled via `globals.css`'s `.prose-editorial` rules. If you change the contract, update all four of: the prompt, the zod schema, the MDX components, **and** the TinaCMS templates.

---

## Scoring

From `src/lib/orchestrator/score.ts`:

```
score = 0.5·popularity + 0.2·engagement + 0.3·recency
```

- **popularity** — log-scaled upvotes, normalized per-source, then weighted by source (HN=1.0, Brave=0.9, Reddit=0.85, Google Trends=0.8, DEV=0.75, RSS=0.7, YT=0.6). Google Trends maps each trending search's approximate traffic to the "upvotes" axis.
- **engagement** — comments-to-upvotes ratio (capped at 1.0)
- **recency** — exponential decay with a **24h half-life**

Dedup uses a sorted-token fingerprint of the title, so "JWST spots new galaxy" and "New galaxy spotted by JWST" collapse to the same signature. The topic log (`content/.topic-log.json`) is checked on every run and capped at 500 entries.

---

## Troubleshooting

**"no items from any source"** — all sources failed. Usually a network blip; check logs. Try `npm run generate -- --dry` after a minute.

**"all top candidates already covered"** — the scorer found winners, but every one has a signature that's already in the topic log. Either wait for new stories or delete recent entries from `content/.topic-log.json`.

**"no research content scrapable"** — the winner's URL and all Brave results failed to scrape (timeouts, 403s, JS-only pages). The pipeline skips gracefully; try again next tick.

**LLM rate limit** — Gemini's free tier (~1,500 req/day) comfortably covers one post/hour, but if you're iterating locally, just wait a moment between runs.

**Cloudflare Pages timeouts** — see the hosting note above. Pages Functions can't run this pipeline end-to-end; let the GitHub Action generate.

---

## Extending

- **Add a source:** drop a new file in `src/lib/sources/`, export a function returning `RawItem[]`, and add it to the `Promise.all` in `pipeline.ts`.
- **Tune the tone:** edit `SYSTEM_PROMPT` in `generate.ts`. The zod schema will catch anything structurally broken.
- **Change the niche / sources:** adjust `audience`, `categories`, and `sources` (`subreddits`, `rssFeeds`, `braveQueries`) in `src/site.config.ts`.
- **Swap the LLM:** edit the `llm` block in `src/site.config.ts` (any OpenAI-compatible endpoint — Gemini, Groq, OpenRouter), and set the matching `apiKeyEnv` secret.
- **Change the cadence:** edit the `cron` in `.github/workflows/generate.yml` (e.g. `0 */2 * * *` for every two hours, `0 12 * * *` for daily).

---

## License

MIT — do whatever you want with it.
