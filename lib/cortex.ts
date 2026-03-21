const CORTEX_URL = process.env.CORTEX_URL || "http://localhost:9091"

export type CortexNode = {
  kind: string
  title: string
  body: string
  importance: number
  tags?: string[]
  metadata?: Record<string, any>
  source_agent?: string
  valid_from?: string
}

/**
 * Store a node in Cortex graph memory.
 */
export async function cortexStore(node: CortexNode): Promise<any | null> {
  try {
    const res = await fetch(`${CORTEX_URL}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: node.kind,
        title: node.title,
        body: node.body,
        importance: node.importance,
        tags: node.tags ?? [],
        metadata: node.metadata ?? {},
        source: { agent: node.source_agent || "lighthouse" },
        valid_from: node.valid_from,
      }),
      signal: AbortSignal.timeout(5000),
    })
    return await res.json()
  } catch (error) {
    console.error("Cortex: failed to store node", error)
    return null
  }
}

/**
 * Search Cortex graph memory by semantic query.
 */
export async function cortexSearch(
  query: string,
  limit?: number
): Promise<{ results: any[] }> {
  try {
    const res = await fetch(`${CORTEX_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: limit || 10 }),
      signal: AbortSignal.timeout(5000),
    })
    return await res.json()
  } catch (error) {
    console.error("Cortex: search failed", error)
    return { results: [] }
  }
}

/**
 * Retrieve a briefing for a specific agent from Cortex.
 */
export async function cortexBriefing(
  agentId: string,
  compact?: boolean
): Promise<any | null> {
  try {
    const res = await fetch(
      `${CORTEX_URL}/briefing/${agentId}?compact=${compact ?? true}`,
      { signal: AbortSignal.timeout(5000) }
    )
    return await res.json()
  } catch (error) {
    console.error("Cortex: briefing failed", error)
    return null
  }
}

/**
 * List nodes from Cortex, optionally filtered by kind.
 */
export async function cortexNodes(
  kind?: string,
  limit?: number
): Promise<{ nodes: any[] }> {
  try {
    const params = new URLSearchParams()
    if (kind) params.set("kind", kind)
    params.set("limit", String(limit || 50))

    const res = await fetch(`${CORTEX_URL}/nodes?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
    })
    return await res.json()
  } catch (error) {
    console.error("Cortex: nodes listing failed", error)
    return { nodes: [] }
  }
}

/**
 * Search Cortex for prior migration patterns matching a given tech stack.
 * Returns a formatted string of the top 5 unique results.
 */
export async function cortexSearchPriorPatterns(
  techStack: {
    frontend_framework: { name: string }
    hosting: { name: string }
    cms?: { name: string }
    commerce?: { name: string }
  }
): Promise<string> {
  try {
    const queries = [
      techStack.frontend_framework.name,
      techStack.hosting.name,
      techStack.cms?.name,
      techStack.commerce?.name,
    ].filter(Boolean) as string[]

    const allResults: any[] = []

    for (const q of queries) {
      const response = await cortexSearch(
        `migration ${q} value-proposition`,
        3
      )
      allResults.push(...response.results)
    }

    const seen = new Set<string>()
    const unique = allResults.filter((r) => {
      if (seen.has(r.title)) return false
      seen.add(r.title)
      return true
    })

    return unique
      .slice(0, 5)
      .map((r) => `[${r.kind}] ${r.title}: ${r.body.slice(0, 200)}`)
      .join("\n")
  } catch (error) {
    console.error("Cortex: prior pattern search failed", error)
    return ""
  }
}
