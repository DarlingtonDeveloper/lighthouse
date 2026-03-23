import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { Tier2Schema } from "./tier2-schema"
import { sanitiseForLLMCompact } from "@/lib/sanitise"
import type { Tier1Result, Tier2Result } from "./types"

/**
 * Tier 2 quick qualification — one Gemini call per URL.
 * Takes a Tier1Result with sanitised HTML and headers.
 */
export async function qualifyTier2(tier1: Tier1Result): Promise<Tier2Result> {
  if (!tier1.raw_html || tier1.raw_html.trim().length === 0) {
    return degradedResult(tier1, "No HTML content available for analysis")
  }

  // Belt-and-suspenders: ensure sanitisation + truncation
  const html = sanitiseForLLMCompact(tier1.raw_html, 30_000)

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash-preview-05-20"),
      schema: Tier2Schema,
      prompt: `You are a Vercel Sales Engineer qualifying a prospect from their website HTML.
This is a quick assessment, not a deep analysis. Be accurate and concise.

CRITICAL RULES:
- State confidence levels honestly. If you're guessing, say confidence: low.
- Commerce detection must be specific. BigCommerce and Shopify have different
  implications. BigCommerce headless vs BigCommerce monolithic matters.
  Look for: bigcommerce.com scripts, shopify CDN URLs, SFCC patterns,
  commercetools API patterns.
- The one_line_summary must be one sentence. No semicolons to sneak in two.
- The executive_paragraph must be one paragraph. No bullet points.
- deal_score must reflect VERCEL FIT specifically, not general site quality.
  A beautiful site on Vercel already scores low (no deal). An ugly site
  with self-hosted Next.js and 1200ms TTFB scores high (easy migration, clear value).

DOMAIN: ${tier1.domain}

HTTP RESPONSE HEADERS:
${JSON.stringify(tier1.raw_headers, null, 2)}

RESPONSE TIME: ${tier1.response_time_ms}ms

HTML SOURCE (sanitised, first 30000 chars):
${html}

HEADER SCAN SIGNALS:
- Next.js detected: ${tier1.is_nextjs}
- React detected: ${tier1.is_react}
- Framework signal: ${tier1.js_framework_signal ?? "none"}
- CDN: ${tier1.cdn_signal ?? "none"}
- Server: ${tier1.server_header ?? "none"}
- Response time: ${tier1.response_time_ms}ms`,
    })

    return {
      url: tier1.url,
      domain: tier1.domain,
      framework: object.framework,
      framework_confidence: object.framework_confidence,
      framework_evidence: object.framework_evidence,
      hosting: object.hosting,
      hosting_confidence: object.hosting_confidence,
      cdn: object.cdn,
      commerce_platform: object.commerce_platform,
      cms: object.cms,
      composable_maturity: object.composable_maturity,
      industry_vertical: object.industry_vertical,
      estimated_size: object.estimated_size,
      deal_score: object.deal_score,
      one_line_summary: object.one_line_summary,
      executive_paragraph: object.executive_paragraph,
      promote_to_tier3: object.promote_to_tier3,
      rationale: object.promotion_rationale,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`qualifyTier2: Gemini failed for ${tier1.domain}`, error)
    return degradedResult(tier1, `Gemini qualification failed: ${msg}`)
  }
}

function degradedResult(tier1: Tier1Result, reason: string): Tier2Result {
  return {
    url: tier1.url,
    domain: tier1.domain,
    framework: tier1.js_framework_signal ?? "unknown",
    framework_confidence: "low",
    framework_evidence: reason,
    hosting: "unknown",
    hosting_confidence: "low",
    cdn: tier1.cdn_signal ?? "unknown",
    commerce_platform: null,
    cms: null,
    composable_maturity: "monolithic",
    industry_vertical: "unknown",
    estimated_size: "unknown",
    deal_score: 0,
    one_line_summary: reason,
    executive_paragraph: reason,
    promote_to_tier3: false,
    rationale: reason,
  }
}
