# Create a new niche site from this template

This repo is a self-contained, hourly auto-blog engine. Everything that makes it
*this* site lives in **`src/site.config.ts`** — change that one file (plus a few
secrets and a Vercel project/domain) and you have a new site in a different
niche running the same engine.

## 1. Clone the template

On GitHub, click **Use this template → Create a new repository** (the source repo
must have "Template repository" enabled in Settings → General). Or fork it.

## 2. Edit `src/site.config.ts`

This is the only file you must edit. Set:

- **Branding** — `name`, `tagline`, `description`, `url` (your production domain,
  no trailing slash), `footerNote`.
- **Audience & taxonomy** — `audience` (one phrase, e.g. "home cooks", "indie game
  developers"; it goes into the writer's system prompt), `categories`, and
  `navCategories` (the subset shown in the header nav).
- **Sources** — the `subreddits`, `rssFeeds`, and `braveQueries` the pipeline
  pulls from. Pick ones that match the niche; this is what the site writes about.
- **Ads** — `adsenseClient` (your own `ca-pub-…`), or `''` to stay ad-free.
- **Engine (optional)** — `llm` (the writer's OpenAI-compatible endpoint, model,
  and which env var holds its key — defaults to **Groq**; swap to
  OpenRouter or any OpenAI-compatible provider via the commented examples) and `imageProvider` (`'pexels'`
  needs a key, `'openverse'` is keyless, `'none'` for no images).

Nothing else needs editing for a basic site.

## 3. Connect Vercel + a domain

1. Import the new repo into Vercel (it auto-detects Next.js).
2. Add a domain in Vercel → Settings → Domains (and point your registrar's DNS at it).
3. Optionally set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_ADSENSE_CLIENT` as env
   vars to override the config per-deploy.

## 4. Set the GitHub Actions secrets

For the hourly generator to run, add under **Settings → Secrets and variables →
Actions**:

- **The LLM key** — required. Its name must match `llm.apiKeyEnv` in
  `site.config.ts` — **`GROQ_API_KEY` by default** (`OPENROUTER_API_KEY`
  if you switch providers). Groq's free tier comfortably covers several
  sites on one key.
- `BRAVE_API_KEY`, `PEXELS_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`
  — optional; any unset source is skipped (Brave/Reddit can be dropped entirely,
  and `imageProvider: 'openverse'` needs no image key).
- Optional integrations: `VERCEL_DEPLOY_HOOK_URL` (force a redeploy per post),
  `BLUESKY_*` / `MASTODON_*` / `DEVTO_API_KEY` (syndication), `BUTTONDOWN_API_KEY`
  (newsletter). All inert until set.

See `.env.example` for the full list.

## 5. Launch

The hourly workflow (`.github/workflows/generate.yml`) runs on its own once
secrets are set. To kick the first post manually: Actions → "Hourly Post
Generation" → **Run workflow**. The site auto-deploys on each commit.

## Notes

- **AdSense is per-site:** each site needs its own approval and `ca-pub-…`.
- **Shared keys + rate limits:** you can reuse one LLM/image key across sites. To
  avoid free-tier rate limits, **give each site a different cron minute** so they
  don't hit the API simultaneously (edit the `cron` in
  `.github/workflows/generate.yml` — e.g. `0`, `12`, `24`, `36`, `48 * * * *`),
  and/or point each site at a different LLM provider via `llm` in `site.config.ts`.
- **Scheduled posts:** future-date a post's `date` frontmatter and it stays
  hidden until then (built-in).
