const siteVariants = {
  'astrokobi-online': {
    key: 'astrokobi-online',
    name: 'AstroKobi Online',
    tagline: 'AI · Signals · The live future',
    description: 'Original reporting and essays from the fast-moving edge of artificial intelligence, space, and future systems.',
    url: 'https://astrokobi.online',
    footerNote: 'tracking the live edge of intelligence and tomorrow.',
    contentDirectory: 'editorial',
    edition: 'Network 001',
    headlineLead: 'The future is',
    headlineAccent: 'already online.',
    intro: 'Sharp dispatches on machine intelligence, planetary systems, and the ideas moving from speculative to real.',
  },
  'astrokobi-site': {
    key: 'astrokobi-site',
    name: 'AstroKobi Site',
    tagline: 'Field notes · Systems · Tomorrow',
    description: 'A field guide to the systems, places, and design decisions shaping humanity’s next century.',
    url: 'https://astrokobi.site',
    footerNote: 'a field manual for futures worth building.',
    contentDirectory: 'editorial',
    edition: 'Fieldbook 001',
    headlineLead: 'Build the',
    headlineAccent: 'next world.',
    intro: 'Practical long-form thinking about future cities, new energy, off-world industry, and technology with consequences.',
  },
  'astrokobi-space': {
    key: 'astrokobi-space',
    name: 'AstroKobi Space',
    tagline: 'Cosmos · Intelligence · Tomorrow',
    description: 'An independent journal about deep space, synthetic intelligence, and the futures taking shape between them.',
    url: 'https://astrokobi.space',
    footerNote: 'field notes from just beyond the known.',
    contentDirectory: 'editorial',
    edition: 'Orbit 001',
    headlineLead: 'Beyond the',
    headlineAccent: 'known.',
    intro: 'Original field notes on deep space, synthetic intelligence, and the futures quietly arriving around us.',
  },
} as const;

export type SiteVariant = keyof typeof siteVariants;
const requestedVariant = process.env.NEXT_PUBLIC_SITE_VARIANT as SiteVariant | undefined;
export const activeSiteVariant: SiteVariant = requestedVariant && requestedVariant in siteVariants
  ? requestedVariant
  : 'astrokobi-space';

export const siteConfig = {
  // ── Branding ──────────────────────────────────────────────────
  ...siteVariants[activeSiteVariant],

  // ── Audience & taxonomy ───────────────────────────────────────
  audience: 'curious readers tracking space, artificial intelligence, and long-range futures',
  categories: ['cosmos', 'intelligence', 'futures'],
  navCategories: ['cosmos', 'intelligence', 'futures'],

  // ── Niche sources ─────────────────────────────────────────────
  sources: {
    // Broadened to cover all aspects of space, the cosmos, and futurism:
    // spaceflight & missions, observational astronomy, astrophysics & cosmology,
    // planetary science, astrobiology, and forward-looking futurism.
    subreddits: [
      'space',
      'astronomy',
      'spacex',
      'nasa',
      'Astrophysics',
      'cosmology',
      'spaceflight',
      'astrophotography',
      'planetaryscience',
      'astrobiology',
      'SpaceXLounge',
      'Futurology',
      'transhumanism',
      'singularity',
    ],
    rssFeeds: [
      // Space news & missions
      'https://www.space.com/feeds/all',
      'https://www.nasa.gov/feed/',
      'https://www.esa.int/rssfeed/Our_Activities/Space_News',
      'https://spacenews.com/feed/',
      'https://phys.org/rss-feed/space-news/',
      // Astronomy & the cosmos
      'https://skyandtelescope.org/feed/',
      'https://www.universetoday.com/feed/',
      'https://earthsky.org/feed/',
      'https://www.sciencedaily.com/rss/space_time.xml',
      'https://www.planetary.org/rss/articles',
      // Futurism
      'https://futurism.com/feed',
      'https://singularityhub.com/feed/',
      'https://bigthink.com/feed/',
    ],
    braveQueries: [
      // Missions & spaceflight
      'space mission news',
      'NASA announcement',
      'rocket launch',
      'SpaceX Starship update',
      'Artemis Moon mission',
      'private spaceflight industry',
      'Mars exploration news',
      // Astronomy & the cosmos
      'new astronomy discovery',
      'James Webb Space Telescope discovery',
      'space telescope new image',
      'black hole discovery',
      'exoplanet discovery',
      'asteroid comet flyby',
      // Astrophysics & cosmology
      'dark matter dark energy research',
      'galaxy formation cosmology',
      'gravitational waves detection',
      'astrobiology search for life',
      // Futurism
      'space colonization future',
      'futurism technology breakthrough',
    ],
  },

  // ── Ads ───────────────────────────────────────────────────────
  adsenseClient: '',

  // ── Affiliate (optional) ──────────────────────────────────────
  // Powers the <GearBox>/<GearPick> MDX components. `amazonTag` is the Amazon
  // Associates tracking id (e.g. 'astrokobi-20'); the `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG`
  // env var overrides it per-deploy. Leave blank to ship the components as plain,
  // untracked outbound links — nothing breaks, they just don't earn until a tag
  // is set. Links are always rendered with rel="sponsored nofollow" + the FTC
  // disclosure, regardless of program, so you can also drop in any retailer's
  // full affiliate URL via <GearPick href="…">.
  affiliate: {
    amazonTag: '',
    // When true, a site-wide affiliate disclosure renders in the footer and on
    // the About page (required by the Amazon Associates Operating Agreement and
    // FTC whenever any affiliate links appear on the site). Leave true for any
    // instance that uses <GearBox>/<GearPick>; set false only for a site with no
    // affiliate links at all.
    disclose: true,
  },

  // ── Engine: writer LLM (Groq, OpenAI-compatible) ──────────────
  llm: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-120b',
    apiKeyEnv: 'GROQ_API_KEY',
  },

  // Automatic failover: if the primary Groq model is rate-limited or errors,
  // generate.ts retries against this smaller Groq model (same API key).
  llmFallback: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-20b',
    apiKeyEnv: 'GROQ_API_KEY',
  },

  // ── Engine: hero images ('pexels' | 'openverse' | 'none') ─────
  imageProvider: 'pexels',
} as const;

export type SiteConfig = typeof siteConfig;
export type ImageProvider = 'pexels' | 'openverse' | 'none';
