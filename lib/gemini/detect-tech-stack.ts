import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { TechStackSchema, type TechStack } from "@/lib/schemas"
import { sanitiseForLLM } from "@/lib/sanitise"

/**
 * detectTechStack
 * ---------------
 * Uses Gemini 2.5 Flash to analyse raw HTML and response headers,
 * producing a structured TechStack detection result.
 *
 * On ANY failure the function returns a degraded result so the
 * pipeline never crashes.
 */
export async function detectTechStack(
  html: string,
  headers: Record<string, string>,
  domain: string,
): Promise<TechStack> {
  try {
    const truncatedHtml = sanitiseForLLM(html)

    const { object } = await generateObject({
      model: google("gemini-2.5-pro"),
      schema: TechStackSchema,
      prompt: `You are a Vercel Solutions Architect conducting technical discovery on the website "${domain}".

Analyse the following HTML source and HTTP response headers to produce a comprehensive technology stack detection.

--- DETECTION PRIORITIES (in order) ---

1. FRAMEWORK DETECTION
   Determine the primary frontend framework. Is this Next.js? What version? App Router or Pages Router? Is it self-hosted (not on Vercel)?
   Key signals to look for:
   - /_next/ asset paths indicate Next.js
   - __NEXT_DATA__ script tag indicates Pages Router
   - next/image component usage
   - _buildManifest.js presence
   - React, Vue, Angular, Svelte, Astro, Nuxt, Gatsby, Remix, or other framework markers
   - Version strings in script URLs, meta tags, or inline scripts

2. HOSTING & INFRASTRUCTURE
   Analyse response headers to determine the hosting provider:
   - x-vercel-id -> Vercel
   - x-amz-cf-id or x-amz-cf-pop -> AWS CloudFront
   - cf-ray -> Cloudflare
   - x-goog-* headers -> Google Cloud
   - x-azure-ref -> Azure
   - server header value (e.g. "nginx", "Apache", "cloudflare", "AmazonS3")
   - Determine CDN layer separately from origin hosting

3. RENDERING STRATEGY
   Classify as SSR, SSG, CSR, ISR, streaming-SSR, hybrid, or unknown:
   - Full server-rendered HTML with hydration scripts -> SSR
   - Static HTML without data-fetching scripts -> SSG
   - Empty root div (e.g. <div id="root"></div>) with JS bundles -> CSR
   - stale-while-revalidate or x-nextjs-cache headers -> ISR
   - Streaming markers or chunked transfer with suspense boundaries -> streaming-SSR
   - Mixed patterns -> hybrid
   - Check for hydration mismatch indicators
   - Detect client-side data fetching that could be server-rendered

4. COMPOSABLE ECOSYSTEM DETECTION
   Identify each service layer if present:
   - CMS: Contentful, Sanity, Storyblok, Prismic, Builder.io, Strapi, WordPress (headless), DatoCMS
   - Commerce: Shopify (Storefront API), Salesforce Commerce Cloud (SFCC), BigCommerce, commercetools, Medusa
   - Search: Algolia, Coveo, Typesense, Elasticsearch, Meilisearch
   - Media/DAM: Cloudinary, imgix, Uploadcare, Fastly Image Optimizer
   - A/B Testing: LaunchDarkly, Optimizely, Statsig, Split, VWO, Google Optimize
   - Personalization: Dynamic Yield, Nosto, Bloomreach, Uniform
   - Auth: Auth0, Clerk, NextAuth/Auth.js, Supabase Auth, Firebase Auth, Okta
   - Payments: Stripe, Braintree, Adyen, PayPal, Square
   - Monitoring: Sentry, Datadog, New Relic, LogRocket, Bugsnag, Raygun
   - Analytics: GA4, Google Tag Manager, Segment, Mixpanel, Amplitude, Heap, PostHog, Hotjar, FullStory
   For each, note the detection signal (script URL, API endpoint, cookie, meta tag, etc.)

5. THIRD-PARTY PERFORMANCE DRAG
   List every external script loaded by the page. For each:
   - Identify its name and purpose (analytics, chat widget, ads, consent, social, etc.)
   - Note the URL pattern it loads from
   - Estimate performance impact as high/medium/low based on:
     - Script size and whether it is render-blocking
     - Whether it loads additional sub-resources
     - Whether it executes synchronously in the critical path

6. COMPOSABLE MATURITY ASSESSMENT
   Rate the overall architecture:
   - "monolithic": Traditional server-rendered monolith (e.g. WordPress, Magento, Drupal all-in-one)
   - "partially-decoupled": Monolith with some headless services or API integrations
   - "headless": Decoupled frontend from backend/CMS but limited service composition
   - "fully-composable": True MACH architecture with independently deployable services

Also detect:
- API patterns: REST, GraphQL, tRPC endpoints; BFF layers; edge middleware
- Meta-framework signals: Turbopack, Webpack chunk patterns, SWC, Vite

--- INPUT DATA ---

HTTP Response Headers:
${JSON.stringify(headers, null, 2)}

HTML Source (first 60,000 characters):
${truncatedHtml}

Produce a complete, accurate detection. When uncertain, set confidence to "low" and explain in the evidence field. Never guess without evidence -- mark unknowns clearly.`,
    })

    return object
  } catch (error) {
    console.error("detectTechStack: Gemini analysis failed", error)

    const errorMessage =
      error instanceof Error ? error.message : String(error)

    // Return a degraded result so the pipeline continues
    return {
      frontend_framework: {
        name: "detection-failed",
        confidence: "low",
        evidence: `Tech stack detection failed: ${errorMessage}`,
        is_nextjs: false,
      },
      rendering_analysis: {
        primary_strategy: "unknown",
        has_hydration_issues: false,
        has_stale_while_revalidate: false,
        client_side_data_fetching: false,
        evidence: `Detection failed: ${errorMessage}`,
      },
      hosting: {
        name: "detection-failed",
        confidence: "low",
        evidence: `Detection failed: ${errorMessage}`,
        is_vercel: false,
        estimated_infra_complexity: "simple",
      },
      cdn: {
        name: "detection-failed",
        confidence: "low",
        evidence: `Detection failed: ${errorMessage}`,
      },
      analytics: [],
      third_party_scripts: [],
      composable_maturity: "monolithic",
      meta_framework_signals: [],
    }
  }
}
