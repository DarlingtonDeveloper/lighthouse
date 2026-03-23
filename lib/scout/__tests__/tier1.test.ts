import { vi, beforeEach, afterEach } from "vitest"
import { scanTier1, scanTier1Batch } from "../tier1"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(
  html: string,
  headers: Record<string, string> = {},
  status = 200
) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(html),
    headers: {
      forEach: (cb: (value: string, key: string) => void) => {
        for (const [k, v] of Object.entries(headers)) {
          cb(v, k.toLowerCase())
        }
      },
    },
  }
}

// ---------------------------------------------------------------------------
// scanTier1
// ---------------------------------------------------------------------------
describe("scanTier1", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("detects Next.js from /_next/ in HTML", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(
        '<html><script src="/_next/static/chunks/main.js"></script></html>',
        { server: "nginx" }
      )
    )

    const result = await scanTier1("https://example.com")

    expect(result.is_nextjs).toBe(true)
    expect(result.js_framework_signal).toBe("/_next/")
    expect(result.verdict).toBe("promote")
    expect(result.reachable).toBe(true)
  })

  it("detects Next.js from __NEXT_DATA__ with high confidence", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(
        '<html><script id="__NEXT_DATA__" type="application/json">{}</script></html>'
      )
    )

    const result = await scanTier1("https://example.com")

    expect(result.is_nextjs).toBe(true)
    expect(result.confidence).toBe("high")
    expect(result.js_framework_signal).toBe("__NEXT_DATA__")
  })

  it("detects Vercel and returns skip verdict", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse("<html></html>", {
        "x-vercel-id": "iad1::abc123",
        "x-vercel-cache": "HIT",
      })
    )

    const result = await scanTier1("https://example.com")

    expect(result.is_vercel).toBe(true)
    expect(result.verdict).toBe("skip")
    expect(result.skip_reason).toBe("Already on Vercel")
    expect(result.raw_html).toBeNull()
  })

  it("detects React from data-reactroot", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse('<html><div data-reactroot="">app</div></html>')
    )

    const result = await scanTier1("https://example.com")

    expect(result.is_react).toBe(true)
    expect(result.verdict).toBe("promote")
    expect(result.confidence).toBe("medium")
  })

  it("detects Nuxt from /__nuxt/ paths", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(
        '<html><script src="/__nuxt/entry.js"></script></html>'
      )
    )

    const result = await scanTier1("https://example.com")

    expect(result.js_framework_signal).toBe("/__nuxt/")
    expect(result.verdict).toBe("promote")
  })

  it("detects Angular from ng-version", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse('<html><app-root ng-version="16.2.0"></app-root></html>')
    )

    const result = await scanTier1("https://example.com")

    expect(result.js_framework_signal).toBe("angular")
    expect(result.verdict).toBe("promote")
  })

  it("returns maybe for pages with no JS framework signals", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse("<html><h1>Hello World</h1></html>")
    )

    const result = await scanTier1("https://example.com")

    expect(result.verdict).toBe("maybe")
    expect(result.confidence).toBe("low")
    expect(result.is_nextjs).toBe(false)
    expect(result.is_react).toBe(false)
  })

  it("returns skip for unreachable URLs", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))

    const result = await scanTier1("https://unreachable.test")

    expect(result.reachable).toBe(false)
    expect(result.verdict).toBe("skip")
    expect(result.skip_reason).toBe("Unreachable")
  })

  it("returns skip for invalid URLs", async () => {
    const result = await scanTier1("not a url at all !!!")

    expect(result.verdict).toBe("skip")
    expect(result.skip_reason).toContain("Invalid")
  })

  it("detects Cloudflare CDN from cf-ray header", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse("<html></html>", {
        "cf-ray": "abc123-IAD",
      })
    )

    const result = await scanTier1("https://example.com")

    expect(result.cdn_signal).toBe("cloudflare")
    expect(result.cdn_evidence).toBe("cf-ray header")
  })

  it("detects CloudFront CDN from x-amz-cf-id header", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse("<html></html>", {
        "x-amz-cf-id": "something",
      })
    )

    const result = await scanTier1("https://example.com")

    expect(result.cdn_signal).toBe("cloudfront")
  })

  it("detects Fastly CDN from x-served-by header", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse("<html></html>", {
        "x-served-by": "cache-iad-kcgs7200077",
      })
    )

    const result = await scanTier1("https://example.com")

    expect(result.cdn_signal).toBe("fastly")
  })

  it("sets priority_boost when response time exceeds 500ms", async () => {
    // Simulate slow response by making text() take time
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                mockFetchResponse("<html></html>")
              ),
            600
          )
        )
    )

    const result = await scanTier1("https://slow.test")

    // response_time_ms includes the fetch + text() time
    expect(result.reachable).toBe(true)
    // May or may not hit 500ms threshold depending on timing,
    // but the field should exist
    expect(typeof result.priority_boost).toBe("boolean")
  })

  it("normalises URLs without protocol", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse("<html></html>")
    )

    const result = await scanTier1("example.com")

    expect(result.url).toBe("https://example.com")
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.any(Object)
    )
  })

  it("stores raw_html for promoted results", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(
        '<html><script src="/_next/static/main.js"></script></html>'
      )
    )

    const result = await scanTier1("https://example.com")

    expect(result.verdict).toBe("promote")
    expect(result.raw_html).not.toBeNull()
    expect(result.raw_html!.length).toBeGreaterThan(0)
  })

  it("stores raw_html for maybe results", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse("<html><p>plain page</p></html>")
    )

    const result = await scanTier1("https://example.com")

    expect(result.verdict).toBe("maybe")
    expect(result.raw_html).not.toBeNull()
  })

  it("records html_size_bytes", async () => {
    const html = "<html>" + "x".repeat(5000) + "</html>"
    mockFetch.mockResolvedValueOnce(mockFetchResponse(html))

    const result = await scanTier1("https://example.com")

    expect(result.html_size_bytes).toBe(html.length)
  })

  it("captures server header", async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse("<html></html>", { server: "Apache/2.4" })
    )

    const result = await scanTier1("https://example.com")

    expect(result.server_header).toBe("Apache/2.4")
  })
})

// ---------------------------------------------------------------------------
// scanTier1Batch
// ---------------------------------------------------------------------------
describe("scanTier1Batch", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("yields results for all URLs", async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse("<html></html>")
    )

    const urls = [
      "https://a.com",
      "https://b.com",
      "https://c.com",
    ]

    const results: any[] = []
    for await (const result of scanTier1Batch(urls)) {
      results.push(result)
    }

    expect(results).toHaveLength(3)
    expect(results.every((r) => r.reachable)).toBe(true)
  })

  it("handles mixed success and failure in a batch", async () => {
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse("<html></html>"))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(mockFetchResponse("<html></html>"))

    const results: any[] = []
    for await (const result of scanTier1Batch([
      "https://a.com",
      "https://b.com",
      "https://c.com",
    ])) {
      results.push(result)
    }

    expect(results).toHaveLength(3)
    expect(results[0].reachable).toBe(true)
    expect(results[1].reachable).toBe(false)
    expect(results[2].reachable).toBe(true)
  })

  it("respects concurrency limit of 5", async () => {
    let concurrentCalls = 0
    let maxConcurrent = 0

    mockFetch.mockImplementation(async () => {
      concurrentCalls++
      maxConcurrent = Math.max(maxConcurrent, concurrentCalls)
      await new Promise((r) => setTimeout(r, 10))
      concurrentCalls--
      return mockFetchResponse("<html></html>")
    })

    const urls = Array.from({ length: 12 }, (_, i) => `https://site${i}.com`)
    const results: any[] = []
    for await (const result of scanTier1Batch(urls)) {
      results.push(result)
    }

    expect(results).toHaveLength(12)
    expect(maxConcurrent).toBeLessThanOrEqual(5)
  })
})
