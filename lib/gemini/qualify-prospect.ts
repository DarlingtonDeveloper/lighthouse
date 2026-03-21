import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { QualificationSchema, type TechStack, type Qualification } from "@/lib/schemas"
import type { PerformanceMetrics } from "@/lib/pagespeed"

// ---------------------------------------------------------------------------
// Careers-page scraper (best-effort)
// ---------------------------------------------------------------------------

const CAREERS_PATHS = [
  "/careers",
  "/jobs",
  null,           // sentinel for careers subdomain variant
  "/about/careers",
] as const

/**
 * Attempt to scrape a careers/jobs page for hiring signals.
 * Tries multiple URL patterns in order and returns the first
 * non-empty HTML response. Returns empty string on total failure.
 */
async function scrapeCareersPage(domain: string): Promise<string> {
  for (const path of CAREERS_PATHS) {
    const url =
      path === null
        ? `https://careers.${domain}`
        : `https://${domain}${path}`

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5_000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LighthouseBot/1.0; +https://lighthouse.dev)",
          Accept: "text/html",
        },
        redirect: "follow",
      })

      if (!response.ok) continue

      const html = await response.text()
      if (html.trim().length === 0) continue

      return html.slice(0, 20_000)
    } catch {
      // Timeout, network error, etc. -- move to next URL.
      continue
    }
  }

  return ""
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * qualifyProspect
 * ---------------
 * Uses Gemini 2.5 Flash to qualify a prospect for Vercel enterprise sales
 * based on their tech stack, web performance data, and hiring signals.
 *
 * On ANY failure the function returns a conservative low-score result
 * so the pipeline never crashes.
 */
export async function qualifyProspect(
  domain: string,
  techStack: TechStack,
  performance: PerformanceMetrics,
): Promise<Qualification> {
  try {
    const careersHtml = await scrapeCareersPage(domain)

    const { object } = await generateObject({
      model: google("gemini-2.5-pro"),
      schema: QualificationSchema,
      prompt: `You are a Vercel enterprise sales qualification analyst. Your job is to honestly assess whether the prospect "${domain}" is a good fit for Vercel enterprise sales outreach.

Score honestly -- a 40/100 is perfectly acceptable. Do not inflate scores.

--- QUALIFICATION CRITERIA ---

1. TRAFFIC TIER
   Determine the prospect's traffic tier based on Chrome UX Report (CrUX) data availability:
   - "enterprise": CrUX URL-level data is available (has_crux_data=true AND crux_origin_data=false). This indicates significant, sustained traffic at the page level.
   - "mid-market": CrUX origin-level data only (has_crux_data=true AND crux_origin_data=true). The site has enough traffic for origin-level aggregation but not page-level.
   - "smb": No CrUX data available (has_crux_data=false). This indicates very low traffic or a new site.
   - "unknown": If the data is ambiguous or unavailable.

2. VERCEL FIT
   Assess how well this prospect fits Vercel's ideal customer profile:

   Strong fit signals:
   - Next.js (especially self-hosted / not on Vercel) -- this is the highest-value signal
   - React SPA that would benefit from SSR/SSG migration
   - Poor web performance metrics that edge computing and Vercel's infrastructure could fix
   - Composable or partially-decoupled architecture ready for a modern frontend platform
   - High third-party script load that edge middleware could optimise

   Moderate fit signals:
   - Non-Next.js JavaScript framework (Vue/Nuxt, Svelte/SvelteKit, Astro, Remix)
   - Moderate performance issues
   - Partially decoupled architecture

   Weak fit signals:
   - Already hosted on Vercel (flag already_on_vercel=true and recommend_action="already-on-vercel")
   - Non-JavaScript framework (PHP, Ruby, Java server-rendered)
   - Monolithic CMS with no evidence of decoupling intent (WordPress, Drupal all-in-one)
   - Static site with no dynamic needs

3. MIGRATION INTENT (from careers page analysis)
   Look for hiring signals that suggest the company is investing in frontend or considering migration:
   - Hiring for Next.js, React, frontend platform, or headless/composable roles
   - Job postings mentioning migration, replatform, re-architecture, or composable commerce
   - Roles for frontend infrastructure, developer experience, or platform engineering
   - Mentions of modernisation initiatives

4. DEAL SIZE SIGNALS
   Consider the business context for deal sizing:
   - Enterprise-tier traffic = larger deal potential
   - E-commerce sites = conversion rate improvement story (every 100ms of LCP improvement = measurable revenue lift)
   - SaaS companies = developer velocity and deployment speed story
   - Media/publishing = SEO and Core Web Vitals story (Google ranking factor)
   - Multiple properties/brands = platform consolidation opportunity

--- PROSPECT DATA ---

Domain: ${domain}

Tech Stack Analysis:
${JSON.stringify(techStack, null, 2)}

Performance Metrics:
${JSON.stringify(performance, null, 2)}

Careers Page HTML (may be empty if no careers page was found):
${careersHtml || "(No careers page content found)"}

--- INSTRUCTIONS ---

Based on all the data above, produce an honest qualification assessment. Consider:
- What is the realistic deal_score (0-100)?
- What traffic tier does the CrUX data indicate?
- Are there real migration signals in the hiring data?
- How strong is the Vercel fit given the current tech stack and performance?
- What is the most appropriate next action for the sales team?
- What industry vertical is this company in, and what business model (B2B/B2C)?

Be specific in your rationale and evidence fields. Reference actual data points from the tech stack and performance metrics.`,
    })

    return object
  } catch (error) {
    console.error("qualifyProspect: Gemini analysis failed", error)

    return {
      deal_score: 0,
      traffic_tier: "unknown",
      migration_signals: {
        hiring_frontend: false,
        hiring_signals: [],
        mentions_headless: false,
        recent_replatform: false,
        evidence: "Qualification failed due to an internal error.",
      },
      vercel_fit: {
        score: "weak",
        rationale: "Unable to assess -- qualification pipeline encountered an error.",
        already_on_vercel: false,
        blockers: ["Qualification failed -- manual review required."],
        accelerators: [],
      },
      company_profile: {
        estimated_size: "unknown",
        industry_vertical: "unknown",
        b2b_or_b2c: "unknown",
      },
      recommended_action: "deprioritise",
      action_rationale:
        "Automated qualification failed. Manual review is recommended before taking action.",
    }
  }
}
