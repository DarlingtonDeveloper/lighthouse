const CORTEX_URL = process.env.CORTEX_URL || "http://localhost:9091"

export type CortexNode = {
  kind: string
  title: string
  body: string
  importance: number
  tags?: string[]
  source_agent?: string
}

/**
 * Store a node in Cortex graph memory.
 * POST /nodes — returns { success, data: { id, kind, title } }
 */
export async function cortexStore(node: CortexNode): Promise<any | null> {
  try {
    const res = await fetch(`${CORTEX_URL}/nodes?gate=skip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-id": node.source_agent || "lighthouse",
        "x-gate-override": "true",
      },
      body: JSON.stringify({
        kind: node.kind,
        title: node.title,
        body: node.body,
        importance: node.importance,
        tags: node.tags ?? [],
        source_agent: node.source_agent || "lighthouse",
      }),
      signal: AbortSignal.timeout(5000),
    })
    const json = await res.json()
    if (!json.success) {
      console.warn("Cortex: store rejected", json.error)
      return null
    }
    return json.data
  } catch (error) {
    console.warn("Cortex: failed to store node", error)
    return null
  }
}

/**
 * Search Cortex graph memory by semantic query.
 * GET /search?q=...&limit=... — returns { success, data: [...] }
 */
export async function cortexSearch(
  query: string,
  limit?: number
): Promise<{ results: any[] }> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit || 10),
    })
    const res = await fetch(`${CORTEX_URL}/search?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
    })
    const json = await res.json()
    // Cortex search returns { node: {...}, score } wrappers — unwrap to flat nodes
    const items = (json.data ?? []).map((hit: any) => hit.node ?? hit)
    return { results: items }
  } catch (error) {
    console.warn("Cortex: search failed", error)
    return { results: [] }
  }
}

/**
 * Retrieve a briefing for a specific agent from Cortex.
 * GET /briefing/:agentId?compact=...
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
    const json = await res.json()
    return json.success ? json.data : null
  } catch (error) {
    console.warn("Cortex: briefing failed", error)
    return null
  }
}

/**
 * List nodes from Cortex, optionally filtered by kind.
 * GET /nodes?kind=...&limit=... — returns { success, data: [...] }
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
    const json = await res.json()
    return { nodes: json.data ?? [] }
  } catch (error) {
    console.warn("Cortex: nodes listing failed", error)
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
      .map((r) => `[${r.kind}] ${r.title}: ${(r.body || "").slice(0, 200)}`)
      .join("\n")
  } catch (error) {
    console.warn("Cortex: prior pattern search failed", error)
    return ""
  }
}
