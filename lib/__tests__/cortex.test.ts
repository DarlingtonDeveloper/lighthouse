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
    metadata: { foo: "bar" },
    source_agent: "lighthouse",
    valid_from: "2026-01-01",
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
    const stored = { id: "abc-123", kind: "pattern" }
    mockFetch.mockResolvedValueOnce(jsonResponse(stored))

    const node = makeSampleNode()
    await cortexStore(node)

    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe(`${CORTEX_URL}/nodes`)
    expect(opts.method).toBe("POST")

    const body = JSON.parse(opts.body)
    expect(body).toEqual({
      kind: "pattern",
      title: "Test Pattern",
      body: "Body text for testing",
      importance: 0.8,
      tags: ["test"],
      metadata: { foo: "bar" },
      source: { agent: "lighthouse" },
      valid_from: "2026-01-01",
    })
  })

  it("returns parsed JSON on success", async () => {
    const stored = { id: "abc-123", kind: "pattern" }
    mockFetch.mockResolvedValueOnce(jsonResponse(stored))

    const result = await cortexStore(makeSampleNode())

    expect(result).toEqual(stored)
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
  it("sends POST to /search with query and limit", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }))

    await cortexSearch("migration React", 5)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe(`${CORTEX_URL}/search`)
    expect(opts.method).toBe("POST")

    const body = JSON.parse(opts.body)
    expect(body).toEqual({ query: "migration React", limit: 5 })
  })

  it("returns { results: [...] } on success", async () => {
    const data = { results: [{ title: "React Migration", score: 0.95 }] }
    mockFetch.mockResolvedValueOnce(jsonResponse(data))

    const result = await cortexSearch("React")

    expect(result).toEqual(data)
  })

  it("returns { results: [] } on failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))

    const result = await cortexSearch("React")

    expect(result).toEqual({ results: [] })
  })

  it("uses default limit of 10 when none is provided", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }))

    await cortexSearch("anything")

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.limit).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// cortexBriefing
// ---------------------------------------------------------------------------
describe("cortexBriefing", () => {
  it("sends GET to /briefing/{agentId}?compact=true", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ summary: "All clear" }))

    await cortexBriefing("lighthouse")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe(`${CORTEX_URL}/briefing/lighthouse?compact=true`)
    // GET is the default; no method should be specified (or it should be GET)
    expect(opts.method).toBeUndefined()
  })

  it("returns parsed JSON on success", async () => {
    const data = { summary: "All clear", tasks: 3 }
    mockFetch.mockResolvedValueOnce(jsonResponse(data))

    const result = await cortexBriefing("lighthouse")

    expect(result).toEqual(data)
  })

  it("returns null on failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))

    const result = await cortexBriefing("lighthouse")

    expect(result).toBeNull()
  })

  it("handles compact=false parameter", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ summary: "Full report" }))

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
    mockFetch.mockResolvedValueOnce(jsonResponse({ nodes: [] }))

    await cortexNodes("pattern", 20)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain(`${CORTEX_URL}/nodes?`)
    expect(url).toContain("kind=pattern")
    expect(url).toContain("limit=20")
  })

  it("returns { nodes: [...] } on success", async () => {
    const data = { nodes: [{ id: "1", kind: "pattern", title: "Test" }] }
    mockFetch.mockResolvedValueOnce(jsonResponse(data))

    const result = await cortexNodes("pattern")

    expect(result).toEqual(data)
  })

  it("returns { nodes: [] } on failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))

    const result = await cortexNodes()

    expect(result).toEqual({ nodes: [] })
  })

  it("uses default limit of 50 when none is provided", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ nodes: [] }))

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
      kind,
      title,
      body: `Details about ${title} migration pattern that should be included in the output text`,
    }
  }

  it("searches for each tech stack component", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ results: [] }))

    await cortexSearchPriorPatterns({
      ...baseTechStack,
      cms: { name: "WordPress" },
      commerce: { name: "Shopify" },
    })

    // Should have called search for: React, Vercel, WordPress, Shopify
    expect(mockFetch).toHaveBeenCalledTimes(4)

    const queries = mockFetch.mock.calls.map(
      (call: any[]) => JSON.parse(call[1].body).query
    )
    expect(queries).toContain("migration React value-proposition")
    expect(queries).toContain("migration Vercel value-proposition")
    expect(queries).toContain("migration WordPress value-proposition")
    expect(queries).toContain("migration Shopify value-proposition")
  })

  it("deduplicates results by title", async () => {
    const duplicate = makeSearchResult("React Migration")

    // Both React and Vercel searches return the same result
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ results: [duplicate] }))
      .mockResolvedValueOnce(jsonResponse({ results: [duplicate] }))

    const result = await cortexSearchPriorPatterns(baseTechStack)

    // Should only appear once in the output
    const lines = result.split("\n").filter(Boolean)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain("React Migration")
  })

  it("returns formatted string with max 5 results", async () => {
    const results = Array.from({ length: 4 }, (_, i) =>
      makeSearchResult(`Pattern ${i}`)
    )

    // React returns 4 results, Vercel returns 4 results = 8 total, 8 unique
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ results }))
      .mockResolvedValueOnce(
        jsonResponse({
          results: Array.from({ length: 4 }, (_, i) =>
            makeSearchResult(`Extra ${i}`)
          ),
        })
      )

    const output = await cortexSearchPriorPatterns(baseTechStack)
    const lines = output.split("\n").filter(Boolean)

    expect(lines.length).toBeLessThanOrEqual(5)

    // Each line should follow the [kind] title: body format
    for (const line of lines) {
      expect(line).toMatch(/^\[.+\] .+: .+/)
    }
  })

  it("returns empty string when no results", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ results: [] }))

    const result = await cortexSearchPriorPatterns(baseTechStack)

    expect(result).toBe("")
  })

  it("returns empty string on failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"))

    const result = await cortexSearchPriorPatterns(baseTechStack)

    expect(result).toBe("")
  })

  it("handles missing optional fields (cms, commerce)", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ results: [] }))

    await cortexSearchPriorPatterns(baseTechStack)

    // Should only search for React and Vercel (no cms or commerce)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
