import { cortexStore } from "./cortex"
import { entityTag } from "./utils"

/**
 * Store a fully-analysed prospect into Cortex graph memory.
 *
 * Every node is written in parallel via Promise.allSettled so that a single
 * Cortex failure never prevents the remaining nodes from being persisted.
 */
export async function storeInCortex(
  domain: string,
  url: string,
  data: {
    techStack: any
    performance: any
    qualification: any
    valueEngineering: any
    architecture: any
  }
): Promise<void> {
  const tag = entityTag(domain)

  const { techStack, performance, qualification, valueEngineering, architecture } = data

  // -------------------------------------------------------------------
  // Build the list of cortexStore promises
  // -------------------------------------------------------------------

  const promises: Promise<any>[] = []

  // 1. Prospect overview
  promises.push(
    cortexStore({
      kind: "prospect",
      importance: 0.9,
      title: domain,
      body: `Prospect ${domain} — deal score ${qualification?.deal_score ?? "N/A"}/100, Vercel fit ${qualification?.vercel_fit?.score ?? "N/A"}, recommended action: ${qualification?.recommended_action ?? "unknown"}.`,
      tags: [tag, "prospect"],
      metadata: {
        url,
        deal_score: qualification?.deal_score,
        vercel_fit: qualification?.vercel_fit?.score,
        traffic_tier: qualification?.traffic_tier,
        industry: qualification?.company_profile?.industry_vertical,
        recommended_action: qualification?.recommended_action,
      },
    })
  )

  // 2. Stack detection
  promises.push(
    cortexStore({
      kind: "stack-detection",
      importance: 0.8,
      title: `${domain}: ${techStack?.frontend_framework?.name ?? "unknown"} on ${techStack?.hosting?.name ?? "unknown"}`,
      body: JSON.stringify(techStack),
      tags: [tag, "tech-stack", techStack?.composable_maturity].filter(Boolean),
      metadata: {
        framework: techStack?.frontend_framework?.name,
        is_nextjs: techStack?.frontend_framework?.is_nextjs,
        hosting: techStack?.hosting?.name,
        cdn: techStack?.cdn?.name,
        cms: techStack?.cms?.name,
        commerce: techStack?.commerce?.name,
        composable_maturity: techStack?.composable_maturity,
        entities: [domain],
      },
    })
  )

  // 3. Performance snapshot
  promises.push(
    cortexStore({
      kind: "performance-snapshot",
      importance: 0.7,
      title: `${domain}: Score ${performance?.performance_score ?? "N/A"}/100, LCP ${performance?.lcp_ms ?? "N/A"}ms`,
      body: JSON.stringify(performance),
      tags: [tag, "performance", performance?.cwv_assessment].filter(Boolean),
      metadata: {
        performance_score: performance?.performance_score,
        lcp_ms: performance?.lcp_ms,
        ttfb_ms: performance?.ttfb_ms,
        cls: performance?.cls,
        has_crux_data: performance?.has_crux_data,
        cwv_assessment: performance?.cwv_assessment,
        entities: [domain],
      },
    })
  )

  // 4. Qualification score
  promises.push(
    cortexStore({
      kind: "qualification-score",
      importance: 0.85,
      title: `${domain}: Deal score ${qualification?.deal_score ?? "N/A"}/100, action: ${qualification?.recommended_action ?? "unknown"}`,
      body: JSON.stringify(qualification),
      tags: [tag, "qualification", qualification?.recommended_action].filter(Boolean),
      metadata: {
        deal_score: qualification?.deal_score,
        traffic_tier: qualification?.traffic_tier,
        vercel_fit: qualification?.vercel_fit?.score,
        industry: qualification?.company_profile?.industry_vertical,
        entities: [domain],
      },
    })
  )

  // 5. Value proposition
  promises.push(
    cortexStore({
      kind: "value-proposition",
      importance: 0.9,
      title: `${domain}: ${valueEngineering?.migration?.approach ?? "unknown"} migration, ${valueEngineering?.migration?.complexity ?? "unknown"} complexity`,
      body: JSON.stringify(valueEngineering),
      tags: [tag, "proposal", valueEngineering?.migration?.approach].filter(Boolean),
      metadata: {
        migration_complexity: valueEngineering?.migration?.complexity,
        migration_approach: valueEngineering?.migration?.approach,
        current_provider: valueEngineering?.competitor_displacement?.current_provider,
        closest_case_study: valueEngineering?.closest_case_study?.company,
        entities: [domain],
      },
    })
  )

  // 6. POC scope
  promises.push(
    cortexStore({
      kind: "poc-scope",
      importance: 0.85,
      title: `${domain}: ${architecture?.poc_proposal?.title ?? "POC proposal"}`,
      body: JSON.stringify(architecture),
      tags: [tag, "poc", "architecture"],
      metadata: {
        poc_duration: architecture?.poc_proposal?.duration,
        poc_scope: architecture?.poc_proposal?.scope,
        entities: [domain],
      },
    })
  )

  // 7. Case study match
  promises.push(
    cortexStore({
      kind: "case-study-match",
      importance: 0.6,
      title: `${domain} matched to ${valueEngineering?.closest_case_study?.company ?? "unknown"}`,
      body: valueEngineering?.closest_case_study?.similarity_rationale ?? "",
      tags: [tag, "case-study"],
      metadata: {
        prospect: domain,
        matched_customer: valueEngineering?.closest_case_study?.company,
        entities: [domain, valueEngineering?.closest_case_study?.company].filter(Boolean),
      },
    })
  )

  // 8. Migration steps (one node per step)
  const migrationSteps: any[] = valueEngineering?.migration?.migration_steps ?? []
  for (const step of migrationSteps) {
    promises.push(
      cortexStore({
        kind: "migration-pattern",
        importance: 0.5,
        title: `${domain} Step ${step?.step}: ${step?.title ?? "untitled"}`,
        body: step?.description ?? "",
        tags: [tag, "migration", valueEngineering?.migration?.approach].filter(Boolean),
        metadata: {
          step_number: step?.step,
          effort: step?.effort,
          risk_level: step?.risk_level,
          migration_approach: valueEngineering?.migration?.approach,
          source_framework: techStack?.frontend_framework?.name,
          source_hosting: techStack?.hosting?.name,
          entities: [domain],
        },
      })
    )
  }

  // -------------------------------------------------------------------
  // Execute all writes in parallel — log failures, never throw
  // -------------------------------------------------------------------

  const results = await Promise.allSettled(promises)

  let failures = 0
  for (const result of results) {
    if (result.status === "rejected") {
      failures++
      console.error("Cortex pipeline: node store failed", result.reason)
    }
  }

  if (failures > 0) {
    console.warn(
      `Cortex pipeline: ${failures}/${results.length} node(s) failed to store for ${domain}`
    )
  }
}
