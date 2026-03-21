import { vi } from "vitest"
import {
  cortexStore,
  cortexSearch,
  cortexBriefing,
  cortexNodes,
  cortexSearchPriorPatterns,
} from "../cortex"
import type { CortexNode } from "../cortex"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CORTEX_URL = "http://localhost:9091"

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }
}

function makeSampleNode(overrides?: Partial<CortexNode>): CortexNode {
  return {
    kind: "pattern",
    title: "Test Pattern",
    body: "Body text for testing",
    importance: 0.8,
    tags: ["test"],
    source_agent: "lighthouse",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal("fetch", mockFetch)
  process.env.CORTEX_URL = CORTEX_URL
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.CORTEX_URL
})

// ---------------------------------------------------------------------------
// cortexStore
// ---------------------------------------------------------------------------
describe("cortexStore", () => {
  it("sends POST to /nodes with the correct body shape", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: { id: "abc-123", kind: "pattern" } })
    )

    const node = makeSampleNode()
    await cortexStore(node)

    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe(`${CORTEX_URL}/nodes?gate=skip`)
    expect(opts.method).toBe("POST")
    expect(opts.headers["x-agent-id"]).toBe("lighthouse")
    expect(opts.headers["x-gate-override"]).toBe("true")

    const body = JSON.parse(opts.body)
    expect(body).toEqual({
      kind: "pattern",
      title: "Test Pattern",
      body: "Body text for testing",
      importance: 0.8,
      tags: ["test"],
      source_agent: "lighthouse",
    })
  })

  it("returns parsed data on success", async () => {
    const stored = { id: "abc-123", kind: "pattern" }
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: stored })
    )

    const result = await cortexStore(makeSampleNode())

    expect(result).toEqual(stored)
  })

  it("returns null when Cortex rejects the write", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: false, error: "Write gate failed" })
    )

    const result = await cortexStore(makeSampleNode())

    expect(result).toBeNull()
  })

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))

    const result = await cortexStore(makeSampleNode())

    expect(result).toBeNull()
  })

  it("returns null on timeout", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError")
    mockFetch.mockRejectedValueOnce(abortError)

    const result = await cortexStore(makeSampleNode())

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// cortexSearch
// ---------------------------------------------------------------------------
describe("cortexSearch", () => {
  it("sends GET to /search with q and limit params", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: [] })
    )

    await cortexSearch("migration React", 5)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain(`${CORTEX_URL}/search?`)
    expect(url).toContain("q=migration+React")
    expect(url).toContain("limit=5")
    // GET — no method specified
    expect(opts.method).toBeUndefined()
  })

  it("returns { results: [...] } on success (unwraps node wrappers)", async () => {
    const node = { title: "React Migration", kind: "pattern", body: "details" }
    const items = [{ node, score: 0.95 }]
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: items })
    )

    const result = await cortexSearch("React")

    expect(result).toEqual({ results: [node] })
  })

  it("returns { results: [] } on failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))

    const result = await cortexSearch("React")

    expect(result).toEqual({ results: [] })
  })

  it("uses default limit of 10 when none is provided", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: [] })
    )

    await cortexSearch("anything")

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain("limit=10")
  })
})

// ---------------------------------------------------------------------------
// cortexBriefing
// ---------------------------------------------------------------------------
describe("cortexBriefing", () => {
  it("sends GET to /briefing/{agentId}?compact=true", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: { summary: "All clear" } })
    )

    await cortexBriefing("lighthouse")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe(`${CORTEX_URL}/briefing/lighthouse?compact=true`)
    expect(opts.method).toBeUndefined()
  })

  it("returns data on success", async () => {
    const data = { summary: "All clear", tasks: 3 }
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data })
    )

    const result = await cortexBriefing("lighthouse")

    expect(result).toEqual(data)
  })

  it("returns null on failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))

    const result = await cortexBriefing("lighthouse")

    expect(result).toBeNull()
  })

  it("returns null when success is false", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: false, error: "not found" })
    )

    const result = await cortexBriefing("lighthouse")

    expect(result).toBeNull()
  })

  it("handles compact=false parameter", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: { summary: "Full report" } })
    )

    await cortexBriefing("lighthouse", false)

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe(`${CORTEX_URL}/briefing/lighthouse?compact=false`)
  })
})

// ---------------------------------------------------------------------------
// cortexNodes
// ---------------------------------------------------------------------------
describe("cortexNodes", () => {
  it("sends GET to /nodes with kind and limit params", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: [] })
    )

    await cortexNodes("pattern", 20)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain(`${CORTEX_URL}/nodes?`)
    expect(url).toContain("kind=pattern")
    expect(url).toContain("limit=20")
  })

  it("returns { nodes: [...] } on success", async () => {
    const items = [{ id: "1", kind: "pattern", title: "Test" }]
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: items })
    )

    const result = await cortexNodes("pattern")

    expect(result).toEqual({ nodes: items })
  })

  it("returns { nodes: [] } on failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))

    const result = await cortexNodes()

    expect(result).toEqual({ nodes: [] })
  })

  it("uses default limit of 50 when none is provided", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: [] })
    )

    await cortexNodes("pattern")

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain("limit=50")
  })
})

// ---------------------------------------------------------------------------
// cortexSearchPriorPatterns
// ---------------------------------------------------------------------------
describe("cortexSearchPriorPatterns", () => {
  const baseTechStack = {
    frontend_framework: { name: "React" },
    hosting: { name: "Vercel" },
  }

  function makeSearchResult(title: string, kind = "pattern") {
    return {
      node: {
        kind,
        title,
        body: `Details about ${title} migration pattern that should be included in the output text`,
      },
      score: 0.8,
    }
  }

  it("searches for each tech stack component", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: [] })
    )

    await cortexSearchPriorPatterns({
      ...baseTechStack,
      cms: { name: "WordPress" },
      commerce: { name: "Shopify" },
    })

    // Should have called search for: React, Vercel, WordPress, Shopify
    expect(mockFetch).toHaveBeenCalledTimes(4)

    const urls = mockFetch.mock.calls.map((call: any[]) => call[0] as string)
    expect(urls.some((u: string) => u.includes("migration+React"))).toBe(true)
    expect(urls.some((u: string) => u.includes("migration+Vercel"))).toBe(true)
    expect(urls.some((u: string) => u.includes("migration+WordPress"))).toBe(true)
    expect(urls.some((u: string) => u.includes("migration+Shopify"))).toBe(true)
  })

  it("deduplicates results by title", async () => {
    const duplicate = makeSearchResult("React Migration")

    mockFetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [duplicate] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [duplicate] }))

    const result = await cortexSearchPriorPatterns(baseTechStack)

    const lines = result.split("\n").filter(Boolean)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain("React Migration")
  })

  it("returns formatted string with max 5 results", async () => {
    const results = Array.from({ length: 4 }, (_, i) =>
      makeSearchResult(`Pattern ${i}`)
    )

    mockFetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: results }))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: Array.from({ length: 4 }, (_, i) =>
            makeSearchResult(`Extra ${i}`)
          ),
        })
      )

    const output = await cortexSearchPriorPatterns(baseTechStack)
    const lines = output.split("\n").filter(Boolean)

    expect(lines.length).toBeLessThanOrEqual(5)

    for (const line of lines) {
      expect(line).toMatch(/^\[.+\] .+: .+/)
    }
  })

  it("returns empty string when no results", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: [] })
    )

    const result = await cortexSearchPriorPatterns(baseTechStack)

    expect(result).toBe("")
  })

  it("returns empty string on failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"))

    const result = await cortexSearchPriorPatterns(baseTechStack)

    expect(result).toBe("")
  })

  it("handles missing optional fields (cms, commerce)", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: [] })
    )

    await cortexSearchPriorPatterns(baseTechStack)

    // Should only search for React and Vercel (no cms or commerce)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
