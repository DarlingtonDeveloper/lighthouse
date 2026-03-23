import { z } from "zod"

/**
 * Compressed Zod schema for Tier 2 quick qualification.
 * One Gemini call returns all of this in a single structured response.
 * Flat fields where possible — no nested objects unless necessary.
 */
export const Tier2Schema = z.object({
  framework: z
    .string()
    .describe(
      "Primary frontend framework: Next.js, React, Vue, Nuxt, Angular, Astro, Svelte, static HTML, WordPress, unknown"
    ),
  framework_version: z.string().optional(),
  framework_confidence: z.enum(["high", "medium", "low"]),
  framework_evidence: z
    .string()
    .describe(
      'Exact signal: "/_next/static/chunks/ paths found", "__NEXT_DATA__ script tag present", etc.'
    ),

  is_nextjs: z.boolean(),
  nextjs_self_hosted: z
    .boolean()
    .optional()
    .describe("True if Next.js but NOT on Vercel"),
  uses_app_router: z.boolean().optional(),

  hosting: z
    .string()
    .describe(
      "AWS, GCP, Azure, Netlify, Cloudflare, Vercel, self-hosted, unknown"
    ),
  hosting_confidence: z.enum(["high", "medium", "low"]),
  hosting_evidence: z.string(),

  cdn: z
    .string()
    .describe(
      "CloudFront, Cloudflare, Fastly, Akamai, Vercel Edge, none detected"
    ),

  commerce_platform: z
    .string()
    .nullable()
    .describe(
      "BigCommerce, Shopify, Salesforce Commerce Cloud, commercetools, Medusa, Saleor, none detected. Be specific about headless vs monolithic usage."
    ),
  commerce_evidence: z.string().nullable(),

  cms: z
    .string()
    .nullable()
    .describe(
      "Contentful, Sanity, Storyblok, Prismic, WordPress, Builder.io, DatoCMS, none detected"
    ),
  cms_evidence: z.string().nullable(),

  other_integrations: z
    .array(z.string())
    .describe(
      "Other detected: Algolia, Stripe, Auth0, Segment, LaunchDarkly, Sentry, etc. Just names, no detail needed."
    ),

  composable_maturity: z.enum([
    "monolithic",
    "partially-decoupled",
    "headless",
    "fully-composable",
  ]),

  industry_vertical: z
    .string()
    .describe(
      "e-commerce, SaaS, fintech, media, healthcare, education, government, agency, other"
    ),
  estimated_size: z.enum([
    "startup",
    "scaleup",
    "mid-market",
    "enterprise",
    "unknown",
  ]),
  b2b_or_b2c: z.enum(["B2B", "B2C", "both", "unknown"]),

  deal_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Vercel deal attractiveness. 80+ = strong fit, 50-79 = worth investigating, <50 = deprioritise. " +
        "Score high: self-hosted Next.js + poor performance + enterprise traffic + composable architecture. " +
        "Score low: already on Vercel, non-JS framework, tiny static site, monolithic CMS with no decoupling intent."
    ),

  one_line_summary: z
    .string()
    .describe(
      'One sentence. Format: "[Framework] on [hosting], [commerce/CMS if relevant]. [Key metric or signal]. [Fit assessment]." ' +
        'Example: "Next.js 14 self-hosted on AWS, headless Shopify + Contentful. 920ms TTFB. Strong Vercel fit." ' +
        'No hedging. No "appears to be" or "seems like". State what was detected and at what confidence.'
    ),

  executive_paragraph: z
    .string()
    .describe(
      "One paragraph for an SE manager to read in 30 seconds. Structure: " +
        "Who they are (vertical, estimated size). What they run (stack). " +
        "Why they are a prospect (the specific problem Vercel solves). " +
        "What the next move is (outreach, discovery call, add to nurture, skip). " +
        "Reference specific data points. No marketing language. " +
        "Sound like a senior SA who looked at the site, not a template."
    ),

  promote_to_tier3: z
    .boolean()
    .describe("Should this get a full Lighthouse analysis?"),
  promotion_rationale: z.string(),
})

export type Tier2GeminiOutput = z.infer<typeof Tier2Schema>
