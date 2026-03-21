import { cortexStore } from "./cortex"
import { entityTag } from "./utils"

/**
 * Store a fully-analysed prospect into Cortex graph memory.
 *
 * Every node is written in parallel via Promise.allSettled so that a single
 * Cortex failure never prevents the remaining nodes from being persisted.
 *
 * Note: Cortex metadata field causes bincode deserialization failures,
 * so all structured data is stored as JSON in the body field instead.
 * Key attributes are encoded into tags for filterability.
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

  const promises: Promise<any>[] = []

  // 1. Prospect overview
  promises.push(
    cortexStore({
      kind: "prospect",
      importance: 0.8,
      title: `Prospect analysis: ${domain}`,
      body: JSON.stringify({
        url,
        domain,
        deal_score: qualification?.deal_score,
        vercel_fit: qualification?.vercel_fit?.score,
        traffic_tier: qualification?.traffic_tier,
        industry: qualification?.company_profile?.industry_vertical,
        recommended_action: qualification?.recommended_action,
        framework: techStack?.frontend_framework?.name,
        hosting: techStack?.hosting?.name,
      }),
      tags: [tag, "prospect", qualification?.recommended_action].filter(Boolean),
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
    })
  )

  // 7. Case study match
  promises.push(
    cortexStore({
      kind: "case-study-match",
      importance: 0.6,
      title: `${domain} matched to ${valueEngineering?.closest_case_study?.company ?? "unknown"}`,
      body: JSON.stringify({
        prospect: domain,
        matched_customer: valueEngineering?.closest_case_study?.company,
        similarity_rationale: valueEngineering?.closest_case_study?.similarity_rationale,
      }),
      tags: [tag, "case-study"],
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
        body: JSON.stringify({
          step_number: step?.step,
          title: step?.title,
          description: step?.description,
          effort: step?.effort,
          risk_level: step?.risk_level,
          migration_approach: valueEngineering?.migration?.approach,
          source_framework: techStack?.frontend_framework?.name,
          source_hosting: techStack?.hosting?.name,
        }),
        tags: [tag, "migration", valueEngineering?.migration?.approach].filter(Boolean),
      })
    )
  }

  // Execute all writes in parallel — log failures, never throw
  const results = await Promise.allSettled(promises)

  let stored = 0
  let failures = 0
  for (const result of results) {
    if (result.status === "rejected") {
      failures++
      console.warn("Cortex pipeline: node store failed", result.reason)
    } else if (result.value === null) {
      failures++
    } else {
      stored++
    }
  }

  if (failures > 0) {
    console.warn(
      `Cortex pipeline: ${stored} stored, ${failures} failed out of ${results.length} for ${domain}`
    )
  }
}
