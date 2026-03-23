import { vi, beforeEach, afterEach } from "vitest"
import { qualifyTier2 } from "../tier2"
import type { Tier1Result } from "../types"

// ---------------------------------------------------------------------------
// Mock the AI SDK
// ---------------------------------------------------------------------------
const mockGenerateObject = vi.fn()
vi.mock("ai", () => ({
  generateObject: (...args: any[]) => mockGenerateObject(...args),
}))

vi.mock("@ai-sdk/google", () => ({
  google: (model: string) => ({ modelId: model }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTier1(overrides: Partial<Tier1Result> = {}): Tier1Result {
  return {
    url: "https://example.com",
    domain: "example.com",
    reachable: true,
    status_code: 200,
    response_time_ms: 350,
    is_vercel: false,
    is_nextjs: true,
    is_react: true,
    js_framework_signal: "/_next/",
    server_header: "nginx",
    cdn_signal: "cloudfront",
    cdn_evidence: "x-amz-cf-id header",
    html_size_bytes: 45000,
    verdict: "promote",
    skip_reason: null,
    priority_boost: false,
    confidence: "high",
    raw_html: '<html><script src="/_next/static/main.js" stripped-inline></script></html>',
    raw_headers: {
      server: "nginx",
      "x-amz-cf-id": "abc123",
    },
    ...overrides,
  }
}

const VALID_GEMINI_RESPONSE = {
  framework: "Next.js",
  framework_version: "14",
  framework_confidence: "high" as const,
  framework_evidence: "/_next/static/chunks/ paths found in HTML",
  is_nextjs: true,
  nextjs_self_hosted: true,
  uses_app_router: true,
  hosting: "AWS",
  hosting_confidence: "high" as const,
  hosting_evidence: "x-amz-cf-id header indicates CloudFront/AWS",
  cdn: "CloudFront",
  commerce_platform: null,
  commerce_evidence: null,
  cms: "Contentful",
  cms_evidence: "Contentful SDK script detected",
  other_integrations: ["Segment", "Sentry"],
  composable_maturity: "headless" as const,
  industry_vertical: "SaaS",
  estimated_size: "mid-market" as const,
  b2b_or_b2c: "B2B" as const,
  deal_score: 82,
  one_line_summary:
    "Next.js 14 self-hosted on AWS with Contentful CMS. 350ms response time. Strong Vercel fit.",
  executive_paragraph:
    "Mid-market B2B SaaS company running self-hosted Next.js 14 on AWS with CloudFront CDN and Contentful CMS. The headless architecture and App Router adoption indicate modern frontend practices. Migration to Vercel would reduce infrastructure management overhead and improve TTFB through edge delivery. Recommend scheduling a discovery call.",
  promote_to_tier3: true,
  promotion_rationale:
    "Self-hosted Next.js with high deal score warrants full analysis.",
}

// ---------------------------------------------------------------------------
// qualifyTier2
// ---------------------------------------------------------------------------
describe("qualifyTier2", () => {
  beforeEach(() => {
    mockGenerateObject.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns a Tier2Result from a successful Gemini call", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_GEMINI_RESPONSE })

    const result = await qualifyTier2(makeTier1())

    expect(result.domain).toBe("example.com")
    expect(result.url).toBe("https://example.com")
    expect(result.framework).toBe("Next.js")
    expect(result.deal_score).toBe(82)
    expect(result.promote_to_tier3).toBe(true)
    expect(result.hosting).toBe("AWS")
    expect(result.cms).toBe("Contentful")
    expect(result.composable_maturity).toBe("headless")
  })

  it("returns degraded result when raw_html is null", async () => {
    const result = await qualifyTier2(makeTier1({ raw_html: null }))

    expect(result.deal_score).toBe(0)
    expect(result.promote_to_tier3).toBe(false)
    expect(result.one_line_summary).toContain("No HTML content")
    // Should not call Gemini
    expect(mockGenerateObject).not.toHaveBeenCalled()
  })

  it("returns degraded result when raw_html is empty", async () => {
    const result = await qualifyTier2(makeTier1({ raw_html: "  " }))

    expect(result.deal_score).toBe(0)
    expect(result.promote_to_tier3).toBe(false)
    expect(mockGenerateObject).not.toHaveBeenCalled()
  })

  it("returns degraded result when Gemini throws", async () => {
    mockGenerateObject.mockRejectedValueOnce(
      new Error("Rate limit exceeded")
    )

    const result = await qualifyTier2(makeTier1())

    expect(result.deal_score).toBe(0)
    expect(result.promote_to_tier3).toBe(false)
    expect(result.one_line_summary).toContain("Gemini qualification failed")
    expect(result.domain).toBe("example.com")
  })

  it("passes correct prompt data to Gemini", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_GEMINI_RESPONSE })

    await qualifyTier2(
      makeTier1({
        domain: "testsite.io",
        response_time_ms: 1200,
        is_nextjs: true,
        is_react: false,
        cdn_signal: "cloudflare",
        server_header: "Apache",
      })
    )

    expect(mockGenerateObject).toHaveBeenCalledTimes(1)
    const callArgs = mockGenerateObject.mock.calls[0][0]
    const prompt = callArgs.prompt as string

    expect(prompt).toContain("testsite.io")
    expect(prompt).toContain("1200ms")
    expect(prompt).toContain("Next.js detected: true")
    expect(prompt).toContain("React detected: false")
    expect(prompt).toContain("CDN: cloudflare")
    expect(prompt).toContain("Server: Apache")
  })

  it("uses the gemini flash model", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_GEMINI_RESPONSE })

    await qualifyTier2(makeTier1())

    const callArgs = mockGenerateObject.mock.calls[0][0]
    expect(callArgs.model.modelId).toContain("gemini")
  })

  it("maps promotion_rationale to rationale field", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: {
        ...VALID_GEMINI_RESPONSE,
        promotion_rationale: "Strong self-hosted Next.js candidate",
      },
    })

    const result = await qualifyTier2(makeTier1())

    expect(result.rationale).toBe("Strong self-hosted Next.js candidate")
  })

  it("preserves url and domain from tier1 input", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_GEMINI_RESPONSE })

    const result = await qualifyTier2(
      makeTier1({ url: "https://custom.io/path", domain: "custom.io" })
    )

    expect(result.url).toBe("https://custom.io/path")
    expect(result.domain).toBe("custom.io")
  })
})
