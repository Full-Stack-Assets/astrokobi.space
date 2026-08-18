# Productizing the Engine — What the Offer Actually Looks Like

AstroKobi is one instance of a **niche-agnostic, template-driven auto-blog
engine**. Everything site-specific lives in `src/site.config.ts`; swapping that
file (plus secrets and a deploy target) runs the same engine as a different site
— this is already documented in `CREATE-A-SITE.md`. That portability *is* the
product. This doc sketches how to package it as an offer.

> **The core insight:** the hard, valuable part isn't the Next.js blog — it's the
> *pipeline* (`src/lib/orchestrator/`): gather 7 trending sources → score → research
> → LLM-write a structured, schema-validated MDX post → commit → auto-deploy, on an
> hourly cron, at **~$0/month steady-state** on free tiers. You're selling a
> self-hosted content machine that runs itself.

---

## 1. What's being sold (the asset)

- A **5-stage generation pipeline** with graceful per-source fallbacks.
- **Niche re-skinning** via one config file (branding, audience, sources, taxonomy, LLM, images).
- A **self-healing content contract** (zod `PostSchema` + strict prompt + MDX components + Tina templates).
- The **growth/monetization layer** now in the repo: AdSense slots, newsletter
  (Buttondown) + weekly digest, and affiliate `<GearBox>` components.
- **Zero-ops economics:** free tiers of Gemini/Groq, Brave, Pexels, GitHub

---

## 2. Who it's for (ICP, in priority order)

1. **Affiliate / niche-site operators** — people who already build content sites
   for SEO + affiliate revenue and understand the model. They get the value
   instantly and have a budget. **Primary ICP.**
2. **Agencies & solo marketers** managing client blogs who want to cut content
   cost to near zero.
3. **Newsletter / media micro-publishers** wanting an always-fresh site under
   their newsletter.
4. **Local/vertical businesses** wanting a "news" surface in their niche without
   a writer. (Higher support cost — serve later.)

---

## 3. Four ways to package it (pick a lane, or ladder them)

### Offer A — Open-core + paid templates ("the WordPress theme model")
Engine is open source; you sell **premium niche packs** (a tuned `site.config.ts`
+ curated `seed-topics.ts` + a matched theme + a seed catalog) for $49–$199 each.
- **Pros:** lowest support burden, community flywheel, SEO from the OSS repo.
- **Cons:** slow monetization; relies on volume.
- **Best when:** you want a developer audience and a long game.

### Offer B — Done-for-you site setup ("productized service")
Flat fee to stand up a complete, deployed, niche site for a client: config,
domain, secrets, seed catalog, monetization wired, handoff doc.
- **Price:** $500–$2,000 setup, optional $50–$150/mo managed (key rotation,
  upgrades, monitoring).
- **Pros:** fastest cash, validates demand, no platform to build.
- **Cons:** doesn't scale past your time unless productized hard.
- **Best when:** you want revenue and proof *this month*. **Recommended first move.**

### Offer C — Hosted SaaS ("the engine as a platform")
You run the infrastructure; customers pick a niche in a dashboard, connect a
domain, and get an auto-blog. Tiered by post frequency / # of sites.
- **Price:** $19 / $49 / $149 per month tiers.
- **Pros:** recurring revenue, biggest TAM, defensible.
- **Cons:** you now absorb the LLM/API costs (margins shrink — the "$0" becomes
  *your* bill), multi-tenant infra, abuse/moderation, support. Real product, real risk.
- **Best when:** B or A has proven demand and you want to scale.

### Offer D — Template marketplace / licensing
License the engine to agencies under a per-seat or per-site commercial license;
they run it on their own infra.
- **Price:** $299–$999 one-time per commercial license, or revenue share.
- **Best as:** an add-on to A/B, not a standalone first move.

**Recommended ladder:** start with **B** (cash + validation) → productize the
delivery into **A** (premium packs) → graduate the proven niches into **C** (SaaS)
once you can stomach the API-cost margin shift.

---

## 4. Packaging the offer (what the buyer gets)

A clean "AstroBlog Engine" product page / repo with:

- **Tiered bundles** (example for Offer A/B):
  - *Starter* ($49): the engine + 1 niche config + setup guide (`CREATE-A-SITE.md`).
  - *Pro* ($199): + a 30-post seed catalog, monetization pre-wired (AdSense +
    newsletter + affiliate), a matched theme.
  - *Done-for-you* ($999): you deploy it live on their domain and hand over keys.
- **A 60-second demo** showing a post being generated and committed.
- **A live proof site** — AstroKobi itself is the demo. "This site wrote itself."
- **Social proof:** post count, traffic, "runs for $0/month" as the headline claim.

---

## 5. Positioning & moat

- **Headline:** *"A blog that writes itself. 7 trending sources → a researched,
  SEO-structured article every hour. Self-hosted. ~$0/month."*
- **Against AI-writer SaaS (Jasper, Byword, etc.):** they charge per word and you
  paste prompts. This is **autonomous + self-hosted + flat-zero cost** — you own
  the repo and the content.
- **Against hiring writers / agencies:** orders of magnitude cheaper, 24/7, never
  misses a trend.
- **The moat is the pipeline + the niche tuning**, not the LLM (which everyone
  has). The scoring weights, the source mix, the self-healing schema, and the
  curated per-niche source/seed packs are the defensible IP.

---

## 6. Honest risks to put on the table

- **"AI slop" / quality perception** — lean into *research-grounded, structured,
  schema-validated* output and the human-review gates (digest send, scheduled
  publishing) as differentiators.
- **Platform/ToS risk** — Google's stance on bulk AI content; source API ToS;
  free-tier limits at scale. A managed SaaS (Offer C) inherits all of these as
  *your* liability. Quality + selectivity is the mitigation.
- **Margin inversion in SaaS** — the "$0/month" magic is per-site on free tiers;
  multi-tenant at volume means *you* pay the LLM/search bills. Price tiers around
  real per-post cost, not the single-site free-tier fantasy.
- **Support load** — every non-technical customer is a support ticket. Offer A
  (developers) and B (you do it) sidestep this; C must invest in onboarding.

---

## 7. Concrete first step (this month)

1. Write a one-page sales page for **Offer B** (done-for-you setup) with AstroKobi
   as the live proof.
2. Hand-pick **3 proven affiliate niches** (e.g. astronomy, home espresso, EV
   ownership) and pre-build their `site.config.ts` + `seed-topics.ts` packs.
3. Sell **3 done-for-you builds** at $750 each to validate willingness-to-pay
   before investing a single day in SaaS infrastructure.
4. Productize whatever you did manually in step 3 into the *Pro* bundle (Offer A).

If step 3 sells, the product is real and the SaaS (Offer C) is worth building. If
it doesn't, you've spent a weekend instead of six months.
