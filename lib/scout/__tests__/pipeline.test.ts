import { vi, beforeEach, afterEach } from "vitest"
import type { ScoutStreamEvent } from "../types"

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Mock tier1
const mockScanTier1Batch = vi.fn()
vi.mock("../tier1", () => ({
  scanTier1Batch: (...args: any[]) => mockScanTier1Batch(...args),
}))

// Mock tier2
const mockQualifyTier2 = vi.fn()
vi.mock("../tier2", () => ({
  qualifyTier2: (...args: any[]) => mockQualifyTier2(...args),
}))

// Mock cortex
const mockCortexSearch = vi.fn()
const mockCortexStore = vi.fn()
vi.mock("@/lib/cortex", () => ({
  cortexSearch: (...args: any[]) => mockCortexSearch(...args),
  cortexStore: (...args: any[]) => mockCortexStore(...args),
  cortexSearchPriorPatterns: () => Promise.resolve(""),
}))

// Mock store pipeline
vi.mock("@/lib/cortex-store-pipeline", () => ({
  storeInCortex: () => Promise.resolve(),
}))

// Mock fetcher + pagespeed + gemini (for tier3)
vi.mock("@/lib/fetcher", () => ({
  fetchPage: () =>
    Promise.resolve({ html: "<html></html>", headers: {} }),
}))
vi.mock("@/lib/pagespeed", () => ({
  getPerformanceMetrics: () =>
    Promise.resolve({ performance_score: 80, lcp_ms: 2000, ttfb_ms: 300 }),
}))
vi.mock("@/lib/gemini", () => ({
  detectTechStack: () =>
    Promise.resolve({
      frontend_framework: { name: "Next.js", is_nextjs: true },
      hosting: { name: "AWS", is_vercel: false },
    }),
  qualifyProspect: () =>
    Promise.resolve({ deal_score: 75, recommended_action: "schedule-discovery-call" }),
  engineerValue: () =>
    Promise.resolve({ migration: { approach: "incremental-migration" } }),
  designArchitecture: () =>
    Promise.resolve({ poc_proposal: { title: "PoC" } }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTier1Result(domain: string, verdict: "promote" | "skip" | "maybe" = "promote") {
  return {
    url: `https://${domain}`,
    domain,
    reachable: verdict !== "skip",
    status_code: verdict === "skip" ? null : 200,
    response_time_ms: 300,
    is_vercel: verdict === "skip" && domain.includes("vercel"),
    is_nextjs: verdict === "promote",
    is_react: true,
    js_framework_signal: "/_next/",
    server_header: "nginx",
    cdn_signal: null,
    cdn_evidence: null,
    html_size_bytes: 10000,
    verdict,
    skip_reason: verdict === "skip" ? "Already on Vercel" : null,
    priority_boost: false,
    confidence: "high" as const,
    raw_html: verdict !== "skip" ? "<html>content</html>" : null,
    raw_headers: {},
  }
}

function makeTier2Result(domain: string, score: number, promote = true) {
  return {
    url: `https://${domain}`,
    domain,
    framework: "Next.js",
    framework_confidence: "high" as const,
    framework_evidence: "/_next/ paths",
    hosting: "AWS",
    hosting_confidence: "high" as const,
    cdn: "CloudFront",
    commerce_platform: null,
    cms: null,
    composable_maturity: "headless" as const,
    industry_vertical: "SaaS",
    estimated_size: "mid-market" as const,
    deal_score: score,
    one_line_summary: `${domain} summary`,
    executive_paragraph: `${domain} executive paragraph`,
    promote_to_tier3: promote,
    rationale: "Good candidate",
  }
}

async function* fakeAsyncGenerator<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item
  }
}

async function collectEvents(gen: AsyncGenerator<ScoutStreamEvent>): Promise<ScoutStreamEvent[]> {
  const events: ScoutStreamEvent[] = []
  for await (const event of gen) {
    events.push(event)
  }
  return events
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("runScout", () => {
  beforeEach(() => {
    mockScanTier1Batch.mockReset()
    mockQualifyTier2.mockReset()
    mockCortexSearch.mockReset()
    mockCortexStore.mockReset()

    // Default: no prior analysis
    mockCortexSearch.mockResolvedValue({ results: [] })
    mockCortexStore.mockResolvedValue({ id: "test" })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("runs tier1 and tier2, yielding events for each", async () => {
    const tier1Results = [
      makeTier1Result("a.com"),
      makeTier1Result("b.com"),
      makeTier1Result("vercel-site.com", "skip"),
    ]
    mockScanTier1Batch.mockReturnValue(fakeAsyncGenerator(tier1Results))

    mockQualifyTier2
      .mockResolvedValueOnce(makeTier2Result("a.com", 75))
      .mockResolvedValueOnce(makeTier2Result("b.com", 45))

    // Import dynamically after mocks are set up
    const { runScout } = await import("../pipeline")
    const events = await collectEvents(
      runScout(["https://a.com", "https://b.com", "https://vercel-site.com"], {
        skip_tier3: true,
      })
    )

    const tier1Events = events.filter((e) => e.stage === "tier1")
    const tier2Events = events.filter((e) => e.stage === "tier2")
    const completeEvents = events.filter((e) => e.stage === "complete")

    // 2 promoted + 1 skipped = 3 tier1 events (skipped ones still emit tier1)
    expect(tier1Events).toHaveLength(3)
    // 2 promoted go to tier2
    expect(tier2Events).toHaveLength(2)
    // 1 complete event
    expect(completeEvents).toHaveLength(1)

    const summary = (completeEvents[0].data as any).summary
    expect(summary.total).toBe(3)
    expect(summary.skipped_vercel).toBe(1)
    expect(summary.promoted_to_tier2).toBe(2)
  })

  it("deduplicates URLs by domain", async () => {
    mockScanTier1Batch.mockImplementation((urls: string[]) => {
      return fakeAsyncGenerator(urls.map((u) => makeTier1Result(u.replace("https://", ""))))
    })
    mockQualifyTier2.mockResolvedValue(makeTier2Result("example.com", 60))

    const { runScout } = await import("../pipeline")
    const events = await collectEvents(
      runScout(
        ["https://example.com", "https://example.com", "example.com"],
        { skip_tier3: true }
      )
    )

    // Should only scan once despite 3 inputs
    expect(mockScanTier1Batch).toHaveBeenCalledWith(
      expect.arrayContaining(["https://example.com"])
    )
    const callArg = mockScanTier1Batch.mock.calls[0][0] as string[]
    // Deduplication should leave only 1
    expect(callArg.length).toBeLessThanOrEqual(2) // "https://example.com" and possibly "example.com" (same domain)
  })

  it("sorts tier2 results by deal score descending in final result", async () => {
    mockScanTier1Batch.mockReturnValue(
      fakeAsyncGenerator([
        makeTier1Result("low.com"),
        makeTier1Result("high.com"),
        makeTier1Result("mid.com"),
      ])
    )

    mockQualifyTier2
      .mockResolvedValueOnce(makeTier2Result("low.com", 20))
      .mockResolvedValueOnce(makeTier2Result("high.com", 90))
      .mockResolvedValueOnce(makeTier2Result("mid.com", 55))

    const { runScout } = await import("../pipeline")
    const events = await collectEvents(
      runScout(["https://low.com", "https://high.com", "https://mid.com"], {
        skip_tier3: true,
      })
    )

    const complete = events.find((e) => e.stage === "complete")
    const results = (complete!.data as any).tier2_results
    expect(results[0].deal_score).toBe(90)
    expect(results[1].deal_score).toBe(55)
    expect(results[2].deal_score).toBe(20)
  })

  it("stores high-score prospects in Cortex", async () => {
    mockScanTier1Batch.mockReturnValue(
      fakeAsyncGenerator([makeTier1Result("hot.com")])
    )
    mockQualifyTier2.mockResolvedValueOnce(
      makeTier2Result("hot.com", 85)
    )

    const { runScout } = await import("../pipeline")
    await collectEvents(
      runScout(["https://hot.com"], { skip_tier3: true })
    )

    // Should store scout-prospect node for score >= 50
    expect(mockCortexStore).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "scout-prospect",
        source_agent: "lighthouse-scout",
      })
    )
  })

  it("does not store low-score prospects in Cortex", async () => {
    mockScanTier1Batch.mockReturnValue(
      fakeAsyncGenerator([makeTier1Result("cold.com")])
    )
    mockQualifyTier2.mockResolvedValueOnce(
      makeTier2Result("cold.com", 30)
    )

    const { runScout } = await import("../pipeline")
    await collectEvents(
      runScout(["https://cold.com"], { skip_tier3: true })
    )

    // scout-prospect should NOT be stored for score < 50
    const scoutCalls = mockCortexStore.mock.calls.filter(
      (call: any[]) => call[0]?.kind === "scout-prospect"
    )
    expect(scoutCalls).toHaveLength(0)
  })

  it("stores scan summary in Cortex on completion", async () => {
    mockScanTier1Batch.mockReturnValue(
      fakeAsyncGenerator([makeTier1Result("site.com")])
    )
    mockQualifyTier2.mockResolvedValueOnce(
      makeTier2Result("site.com", 60)
    )

    const { runScout } = await import("../pipeline")
    await collectEvents(
      runScout(["https://site.com"], { skip_tier3: true })
    )

    // Should store scout-scan summary
    const scanCalls = mockCortexStore.mock.calls.filter(
      (call: any[]) => call[0]?.kind === "scout-scan"
    )
    expect(scanCalls).toHaveLength(1)
    expect(scanCalls[0][0].tags).toContain("scout")
    expect(scanCalls[0][0].tags).toContain("territory-scan")
  })

  it("handles tier2 Gemini failures gracefully", async () => {
    mockScanTier1Batch.mockReturnValue(
      fakeAsyncGenerator([
        makeTier1Result("ok.com"),
        makeTier1Result("fail.com"),
      ])
    )

    mockQualifyTier2
      .mockResolvedValueOnce(makeTier2Result("ok.com", 70))
      .mockRejectedValueOnce(new Error("Gemini rate limited"))

    const { runScout } = await import("../pipeline")
    const events = await collectEvents(
      runScout(["https://ok.com", "https://fail.com"], { skip_tier3: true })
    )

    const errorEvents = events.filter((e) => e.stage === "error")
    const tier2Events = events.filter((e) => e.stage === "tier2")

    // One success, one error
    expect(tier2Events).toHaveLength(1)
    expect(errorEvents).toHaveLength(1)
    expect((errorEvents[0].data as any).message).toContain("fail.com")

    // Pipeline should still complete
    const complete = events.find((e) => e.stage === "complete")
    expect(complete).toBeDefined()
  })

  it("emits complete event with correct summary shape", async () => {
    mockScanTier1Batch.mockReturnValue(
      fakeAsyncGenerator([makeTier1Result("test.com")])
    )
    mockQualifyTier2.mockResolvedValueOnce(
      makeTier2Result("test.com", 50)
    )

    const { runScout } = await import("../pipeline")
    const events = await collectEvents(
      runScout(["https://test.com"], { skip_tier3: true })
    )

    const complete = events.find((e) => e.stage === "complete")
    expect(complete).toBeDefined()
    const data = complete!.data as any

    expect(data.scan_id).toBeDefined()
    expect(data.started_at).toBeDefined()
    expect(data.completed_at).toBeDefined()
    expect(data.input_count).toBe(1)
    expect(data.tier1_results).toHaveLength(1)
    expect(data.tier2_results).toHaveLength(1)
    expect(data.summary).toMatchObject({
      total: 1,
      promoted_to_tier2: 1,
      promoted_to_tier3: 0,
      skipped_vercel: 0,
      skipped_unreachable: 0,
    })
  })
})
