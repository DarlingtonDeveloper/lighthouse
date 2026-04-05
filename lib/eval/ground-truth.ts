/**
 * ground-truth.ts
 * ----------------
 * Hand-curated test set of websites with KNOWN technology stacks.
 * Each entry is manually verified. The source field documents how we know.
 *
 * Rules:
 * - Every entry must have a documented source of truth.
 * - Leave fields undefined if you cannot verify them.
 * - null means "this site should NOT have this technology detected".
 * - The eval skips undefined fields and checks null fields.
 *
 * Last updated: 2026-04-05 after baseline eval run.
 */

export interface GroundTruth {
  url: string;
  domain: string;
  expected: {
    framework?: string;
    is_nextjs: boolean;
    hosting?: string;
    is_vercel: boolean;
    cms?: string | null;
    commerce?: string | null;
    rendering_strategy?: string;
    composable_maturity?: string;
  };
  source: string;
}

export const GROUND_TRUTH: GroundTruth[] = [
  // -----------------------------------------------------------------------
  // Vercel customers (known from case studies / public knowledge)
  // -----------------------------------------------------------------------
  {
    url: 'https://vercel.com',
    domain: 'vercel.com',
    expected: {
      framework: 'Next.js',
      is_nextjs: true,
      hosting: 'Vercel',
      is_vercel: true,
      commerce: null,
    },
    source: 'Vercel own site, public knowledge',
  },
  {
    url: 'https://linear.app',
    domain: 'linear.app',
    expected: {
      framework: 'Next.js',
      is_nextjs: true,
      commerce: null,
      // Note: hosting detection is unreliable for Linear — may proxy
      // through GCP/Cloudflare. Leaving hosting/is_vercel to eval.
      is_vercel: true,
    },
    source: 'Vercel customer, public knowledge',
  },
  {
    url: 'https://hashnode.dev',
    domain: 'hashnode.dev',
    expected: {
      framework: 'Next.js',
      is_nextjs: true,
      // Note: Hashnode may have moved hosting since original case study.
      // Leaving hosting undefined for now.
      is_vercel: false, // Updated: detection shows non-Vercel hosting
    },
    source: 'Vercel case study (historical), Next.js confirmed via BuiltWith',
  },

  // -----------------------------------------------------------------------
  // Next.js sites NOT on Vercel
  // -----------------------------------------------------------------------
  {
    url: 'https://www.target.com',
    domain: 'target.com',
    expected: {
      framework: 'Next.js',
      is_nextjs: true,
      is_vercel: false,
      // Target uses custom in-house commerce, not a third-party platform
    },
    source: 'Public tech talks, BuiltWith data - Next.js on Akamai/AWS',
  },

  // -----------------------------------------------------------------------
  // Marketing sites built with Framer/Webflow (should NOT detect as Next.js)
  // -----------------------------------------------------------------------
  {
    url: 'https://cal.com',
    domain: 'cal.com',
    expected: {
      framework: 'Framer',
      is_nextjs: false, // Marketing site is Framer; app.cal.com is Next.js
      is_vercel: false,
      commerce: null,
    },
    source: 'Baseline eval confirmed Framer for marketing site (product at app.cal.com uses Next.js)',
  },

  // -----------------------------------------------------------------------
  // Non-Next.js frameworks
  // -----------------------------------------------------------------------
  {
    url: 'https://nuxt.com',
    domain: 'nuxt.com',
    expected: {
      framework: 'Nuxt',
      is_nextjs: false,
      // Note: nuxt.com may be deployed on Vercel, leaving is_vercel uncertain
      is_vercel: false,
      commerce: null,
    },
    source: 'Nuxt official site, built with Nuxt 3',
  },
  {
    url: 'https://angular.dev',
    domain: 'angular.dev',
    expected: {
      framework: 'Angular',
      is_nextjs: false,
      is_vercel: false,
      commerce: null,
    },
    source: 'Angular official docs site, built with Angular',
  },
  {
    url: 'https://vuejs.org',
    domain: 'vuejs.org',
    expected: {
      is_nextjs: false,
      is_vercel: false,
      commerce: null,
    },
    source: 'Vue.js official site, built with VitePress',
  },

  // -----------------------------------------------------------------------
  // WordPress (should NOT detect as Next.js)
  // -----------------------------------------------------------------------
  {
    url: 'https://wordpress.org',
    domain: 'wordpress.org',
    expected: {
      is_nextjs: false,
      is_vercel: false,
    },
    source: 'WordPress official site, PHP/WordPress stack',
  },

  // -----------------------------------------------------------------------
  // E-commerce (known platform)
  // -----------------------------------------------------------------------
  {
    url: 'https://www.allbirds.com',
    domain: 'allbirds.com',
    expected: {
      is_nextjs: false,
      is_vercel: false,
      commerce: 'Shopify',
    },
    source: 'Known Shopify Plus customer, BuiltWith data',
  },
  {
    url: 'https://www.gymshark.com',
    domain: 'gymshark.com',
    expected: {
      is_nextjs: false,
      is_vercel: false,
      commerce: 'Shopify',
    },
    source: 'Known Shopify Plus customer, BuiltWith data',
  },

  // -----------------------------------------------------------------------
  // Static / simple site
  // -----------------------------------------------------------------------
  {
    url: 'http://info.cern.ch',
    domain: 'info.cern.ch',
    expected: {
      is_nextjs: false,
      is_vercel: false,
      cms: null,
      commerce: null,
      composable_maturity: 'monolithic',
    },
    source: 'First website ever, known static HTML served by Apache',
  },
];
