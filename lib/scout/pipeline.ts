import { scanTier1Batch } from "./tier1"
import { qualifyTier2 } from "./tier2"
import { extractDomain } from "@/lib/utils"
import { cortexSearch, cortexStore } from "@/lib/cortex"
import { entityTag } from "@/lib/utils"
import { storeInCortex } from "@/lib/cortex-store-pipeline"
import { fetchPage } from "@/lib/fetcher"
import { getPerformanceMetrics } from "@/lib/pagespeed"
import {
  detectTechStack,
  qualifyProspect,
  engineerValue,
  designArchitecture,
} from "@/lib/gemini"
import { cortexSearchPriorPatterns } from "@/lib/cortex"
import type { Tier1Result, Tier2Result, ScoutResult, ScoutStreamEvent } from "./types"

interface ScoutOptions {
  tier3_limit?: number
  skip_vercel?: boolean
  skip_tier3?: boolean
}

/**
 * Run the Scout three-tier qualification funnel.
 * Yields stream events for each result as it completes.
 */
export async function* runScout(
  urls: string[],
  options?: ScoutOptions
): AsyncGenerator<ScoutStreamEvent> {
  const tier3Limit = options?.tier3_limit ?? 5
  const skipVercel = options?.skip_vercel ?? true
  const skipTier3 = options?.skip_tier3 ?? false

  const scanId = crypto.randomUUID()
  const startedAt = new Date().toISOString()

  // Deduplicate by domain
  const seen = new Set<string>()
  const dedupedUrls: string[] = []
  for (const url of urls) {
    let domain: string
    try {
      const normalised = /^https?:\/\//i.test(url.trim())
        ? url.trim()
        : `https://${url.trim()}`
      domain = extractDomain(normalised)
    } catch {
      domain = url.trim()
    }
    if (!seen.has(domain)) {
      seen.add(domain)
      dedupedUrls.push(url)
    }
  }

  const tier1Results: Tier1Result[] = []
  const tier2Results: Tier2Result[] = []
  const tier3Domains: string[] = []

  // Summary counters
  let skippedVercel = 0
  let skippedUnreachable = 0
  let skippedNoJs = 0
  let skippedOther = 0

  // --- Check Cortex for previously analysed domains ---
  const previouslyAnalysed = new Map<string, number>()
  try {
    for (const domain of seen) {
      const searchResult = await cortexSearch(domain, 5)
      const prospectNode = searchResult.results.find(
        (n: any) =>
          (n.kind === "Prospect" || n.kind === "prospect") &&
          n.tags?.includes(entityTag(domain))
      )
      if (prospectNode) {
        try {
          const body = JSON.parse(prospectNode.body)
          if (body?.deal_score != null) {
            previouslyAnalysed.set(domain, body.deal_score)
          }
        } catch {
          // ignore parse failure
        }
      }
    }
  } catch {
    // Cortex may be unavailable — continue without
  }

  // --- TIER 1: Header scan ---
  const toTier2: Tier1Result[] = []

  for await (const result of scanTier1Batch(dedupedUrls)) {
    tier1Results.push(result)

    // Check if previously analysed
    if (previouslyAnalysed.has(result.domain)) {
      const priorScore = previouslyAnalysed.get(result.domain)!
      // Yield as tier2 with prior data
      const priorResult: Tier2Result = {
        url: result.url,
        domain: result.domain,
        framework: result.js_framework_signal ?? "unknown",
        framework_confidence: "medium",
        framework_evidence: "Previously analysed in Lighthouse",
        hosting: "unknown",
        hosting_confidence: "low",
        cdn: result.cdn_signal ?? "unknown",
        commerce_platform: null,
        cms: null,
        composable_maturity: "monolithic",
        industry_vertical: "unknown",
        estimated_size: "unknown",
        deal_score: priorScore,
        one_line_summary: `Previously analysed, score: ${priorScore}/100`,
        executive_paragraph: `This domain was previously analysed in Lighthouse with a deal score of ${priorScore}/100. View the full report for details.`,
        promote_to_tier3: false,
        rationale: "Already has full Lighthouse analysis",
      }
      tier2Results.push(priorResult)
      yield { stage: "tier2", url: result.url, data: priorResult }
      continue
    }

    yield { stage: "tier1", url: result.url, data: result }

    if (result.verdict === "skip") {
      if (result.skip_reason === "Already on Vercel") skippedVercel++
      else if (result.skip_reason === "Unreachable") skippedUnreachable++
      else skippedOther++
    } else {
      // promote and maybe both go to Tier 2
      toTier2.push(result)
    }
  }

  // --- TIER 2: Quick Gemini qualification ---
  const TIER2_CONCURRENCY = 3

  for (let i = 0; i < toTier2.length; i += TIER2_CONCURRENCY) {
    const batch = toTier2.slice(i, i + TIER2_CONCURRENCY)
    const results = await Promise.allSettled(batch.map((t1) => qualifyTier2(t1)))

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      const t1 = batch[j]

      if (result.status === "fulfilled") {
        tier2Results.push(result.value)
        yield { stage: "tier2", url: t1.url, data: result.value }

        // Store qualified prospects in Cortex (score >= 50)
        if (result.value.deal_score >= 50 && !previouslyAnalysed.has(result.value.domain)) {
          try {
            await cortexStore({
              kind: "scout-prospect",
              title: `${result.value.domain}: Score ${result.value.deal_score}, ${result.value.one_line_summary}`,
              body: JSON.stringify(result.value),
              importance: result.value.deal_score / 100,
              tags: [
                entityTag(result.value.domain),
                "scout",
                result.value.industry_vertical,
                result.value.composable_maturity,
              ],
              source_agent: "lighthouse-scout",
            })
          } catch {
            // Non-fatal: Cortex storage failure shouldn't break the pipeline
          }
        }
      } else {
        // Gemini failed for this URL
        yield {
          stage: "error",
          url: t1.url,
          data: { message: `Tier 2 failed for ${t1.domain}: ${result.reason}` },
        }
      }
    }
  }

  // Sort by deal score descending
  tier2Results.sort((a, b) => b.deal_score - a.deal_score)

  // --- TIER 3: Full Lighthouse analysis (optional) ---
  if (!skipTier3 && tier3Limit > 0) {
    const candidates = tier2Results
      .filter((r) => r.promote_to_tier3 && !previouslyAnalysed.has(r.domain))
      .slice(0, tier3Limit)

    for (const candidate of candidates) {
      try {
        yield { stage: "tier3", url: candidate.url, data: { message: `Starting full analysis: ${candidate.domain}` } }

        // Run the existing Lighthouse pipeline directly
        const { html, headers } = await fetchPage(candidate.url)
        const [techStack, perf] = await Promise.all([
          detectTechStack(html, headers, candidate.domain),
          getPerformanceMetrics(candidate.url),
        ])
        const qualification = await qualifyProspect(candidate.domain, techStack, perf)
        const priorPatterns = await cortexSearchPriorPatterns(techStack)
        const valueEngineering = await engineerValue(
          candidate.domain,
          techStack,
          perf,
          qualification,
          priorPatterns
        )
        const architecture = await designArchitecture(
          candidate.domain,
          techStack,
          perf,
          valueEngineering
        )

        // Store in Cortex
        await storeInCortex(candidate.domain, candidate.url, {
          techStack,
          performance: perf,
          qualification,
          valueEngineering,
          architecture,
        })

        tier3Domains.push(candidate.domain)
        yield { stage: "tier3", url: candidate.url, data: { message: `Full analysis complete: ${candidate.domain}` } }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        yield {
          stage: "error",
          url: candidate.url,
          data: { message: `Tier 3 failed for ${candidate.domain}: ${msg}` },
        }
      }
    }
  }

  // Count skips for URLs that had no JS framework in tier1 and didn't get promoted
  for (const t1 of tier1Results) {
    if (t1.verdict === "maybe" && !tier2Results.some((t2) => t2.domain === t1.domain)) {
      skippedNoJs++
    }
  }

  // --- COMPLETE ---
  const completedAt = new Date().toISOString()
  const scoutResult: ScoutResult = {
    scan_id: scanId,
    started_at: startedAt,
    completed_at: completedAt,
    input_count: dedupedUrls.length,
    tier1_results: tier1Results,
    tier2_results: tier2Results,
    tier3_domains: tier3Domains,
    summary: {
      total: dedupedUrls.length,
      promoted_to_tier2: toTier2.length,
      promoted_to_tier3: tier3Domains.length,
      skipped_vercel: skippedVercel,
      skipped_unreachable: skippedUnreachable,
      skipped_no_js: skippedNoJs,
      skipped_other: skippedOther,
    },
  }

  // Store scan summary in Cortex
  try {
    await cortexStore({
      kind: "scout-scan",
      title: `Scout scan: ${dedupedUrls.length} URLs, ${tier2Results.length} qualified, top: ${tier2Results.slice(0, 3).map((r) => r.domain).join(", ")}`,
      body: JSON.stringify(scoutResult.summary),
      importance: 0.6,
      tags: ["scout", "territory-scan"],
      source_agent: "lighthouse-scout",
    })
  } catch {
    // Non-fatal
  }

  yield { stage: "complete", data: scoutResult }
}
