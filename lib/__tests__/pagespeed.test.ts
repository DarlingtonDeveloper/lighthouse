import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getPerformanceMetrics } from '../pagespeed'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockPSIResponse = {
  lighthouseResult: {
    audits: {
      'largest-contentful-paint': { numericValue: 2500 },
      'max-potential-fid': { numericValue: 100 },
      'cumulative-layout-shift': { numericValue: 0.05 },
      'first-contentful-paint': { numericValue: 1200 },
      'server-response-time': { numericValue: 400 },
      'total-blocking-time': { numericValue: 200 },
      'speed-index': { numericValue: 3000 },
      'final-screenshot': { details: { data: 'base64data' } },
    },
    categories: { performance: { score: 0.85 } },
  },
}

const mockCrUXResponse = {
  record: {
    metrics: {
      largest_contentful_paint: { percentiles: { p75: 2200 } },
      interaction_to_next_paint: { percentiles: { p75: 180 } },
      cumulative_layout_shift: { percentiles: { p75: 8 } },
      experimental_time_to_first_byte: { percentiles: { p75: 600 } },
    },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_URL = 'https://example.com'

function isPSICall(url: string | URL | Request): boolean {
  const s = typeof url === 'string' ? url : url.toString()
  return s.includes('pagespeedonline')
}

function isCrUXCall(url: string | URL | Request): boolean {
  const s = typeof url === 'string' ? url : url.toString()
  return s.includes('chromeuxreport')
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getPerformanceMetrics', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubEnv('PSI_API_KEY', 'test-key')
    vi.stubEnv('CRUX_API_KEY', 'test-key')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------

  it('returns complete metrics when both PSI and CrUX succeed', async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (isPSICall(url)) return jsonResponse(mockPSIResponse)
      if (isCrUXCall(url)) return jsonResponse(mockCrUXResponse)
      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    // Lab data present
    expect(result.lcp_ms).toBe(2500)
    expect(result.performance_score).toBe(85)

    // Field data present
    expect(result.crux_lcp_p75).toBe(2200)
    expect(result.has_crux_data).toBe(true)

    // CWV assessment resolved
    expect(result.cwv_assessment).not.toBe('unknown')
  })

  // -----------------------------------------------------------------------
  // PSI-only (CrUX fails)
  // -----------------------------------------------------------------------

  it('returns lab-only metrics when CrUX fails', async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (isPSICall(url)) return jsonResponse(mockPSIResponse)
      if (isCrUXCall(url)) return jsonResponse({}, 500)
      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    expect(result.lcp_ms).toBe(2500)
    expect(result.performance_score).toBe(85)
    expect(result.has_crux_data).toBe(false)
    expect(result.crux_lcp_p75).toBeNull()
    expect(result.crux_inp_p75).toBeNull()
  })

  // -----------------------------------------------------------------------
  // Both fail
  // -----------------------------------------------------------------------

  it('returns default metrics when both fail', async () => {
    globalThis.fetch = vi.fn(async () => {
      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    expect(result.lcp_ms).toBeNull()
    expect(result.fid_ms).toBeNull()
    expect(result.cls).toBeNull()
    expect(result.performance_score).toBeNull()
    expect(result.has_crux_data).toBe(false)
    expect(result.cwv_assessment).toBe('unknown')
  })

  // -----------------------------------------------------------------------
  // PSI audit extraction
  // -----------------------------------------------------------------------

  it('correctly extracts PSI audit values', async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (isPSICall(url)) return jsonResponse(mockPSIResponse)
      if (isCrUXCall(url)) return jsonResponse({}, 500)
      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    expect(result.lcp_ms).toBe(2500)
    expect(result.fid_ms).toBe(100)
    expect(result.cls).toBe(0.05)
    expect(result.fcp_ms).toBe(1200)
    expect(result.ttfb_ms).toBe(400)
    expect(result.tbt_ms).toBe(200)
    expect(result.speed_index_ms).toBe(3000)
    expect(result.screenshot_base64).toBe('base64data')
    // score is Math.round(0.85 * 100) = 85
    expect(result.performance_score).toBe(85)
  })

  // -----------------------------------------------------------------------
  // CrUX p75 extraction
  // -----------------------------------------------------------------------

  it('correctly extracts CrUX p75 values', async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (isPSICall(url)) return jsonResponse(mockPSIResponse)
      if (isCrUXCall(url)) return jsonResponse(mockCrUXResponse)
      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    expect(result.crux_lcp_p75).toBe(2200)
    expect(result.crux_inp_p75).toBe(180)
    // CLS is divided by 100: 8 / 100 = 0.08
    expect(result.crux_cls_p75).toBe(0.08)
    expect(result.crux_ttfb_p75).toBe(600)
  })

  // -----------------------------------------------------------------------
  // has_crux_data flag
  // -----------------------------------------------------------------------

  it('sets has_crux_data to true when CrUX succeeds', async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (isPSICall(url)) return jsonResponse(mockPSIResponse)
      if (isCrUXCall(url)) return jsonResponse(mockCrUXResponse)
      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    expect(result.has_crux_data).toBe(true)
  })

  // -----------------------------------------------------------------------
  // CWV assessment: good
  // -----------------------------------------------------------------------

  it('assesses CWV as good when all metrics pass', async () => {
    const goodPSI = {
      lighthouseResult: {
        audits: {
          'largest-contentful-paint': { numericValue: 2000 },
          'max-potential-fid': { numericValue: 50 },
          'cumulative-layout-shift': { numericValue: 0.05 },
          'first-contentful-paint': { numericValue: 800 },
          'server-response-time': { numericValue: 200 },
          'total-blocking-time': { numericValue: 100 },
          'speed-index': { numericValue: 1500 },
          'final-screenshot': { details: { data: 'base64' } },
        },
        categories: { performance: { score: 0.95 } },
      },
    }

    const goodCrUX = {
      record: {
        metrics: {
          largest_contentful_paint: { percentiles: { p75: 2000 } },
          interaction_to_next_paint: { percentiles: { p75: 150 } },
          cumulative_layout_shift: { percentiles: { p75: 5 } },
          experimental_time_to_first_byte: { percentiles: { p75: 400 } },
        },
      },
    }

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (isPSICall(url)) return jsonResponse(goodPSI)
      if (isCrUXCall(url)) return jsonResponse(goodCrUX)
      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    expect(result.cwv_assessment).toBe('good')
  })

  // -----------------------------------------------------------------------
  // CWV assessment: poor (LCP > 4000)
  // -----------------------------------------------------------------------

  it('assesses CWV as poor when LCP exceeds 4000', async () => {
    const poorPSI = {
      lighthouseResult: {
        audits: {
          'largest-contentful-paint': { numericValue: 5000 },
          'max-potential-fid': { numericValue: 50 },
          'cumulative-layout-shift': { numericValue: 0.05 },
          'first-contentful-paint': { numericValue: 800 },
          'server-response-time': { numericValue: 200 },
          'total-blocking-time': { numericValue: 100 },
          'speed-index': { numericValue: 1500 },
          'final-screenshot': { details: { data: 'base64' } },
        },
        categories: { performance: { score: 0.4 } },
      },
    }

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (isPSICall(url)) return jsonResponse(poorPSI)
      if (isCrUXCall(url)) return jsonResponse({}, 500)
      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    expect(result.cwv_assessment).toBe('poor')
  })

  // -----------------------------------------------------------------------
  // CWV assessment: needs-improvement (borderline)
  // -----------------------------------------------------------------------

  it('assesses CWV as needs-improvement for borderline values', async () => {
    // LCP between 2500–4000 is "needs-improvement"
    const borderlinePSI = {
      lighthouseResult: {
        audits: {
          'largest-contentful-paint': { numericValue: 3200 },
          'max-potential-fid': { numericValue: 50 },
          'cumulative-layout-shift': { numericValue: 0.05 },
          'first-contentful-paint': { numericValue: 800 },
          'server-response-time': { numericValue: 200 },
          'total-blocking-time': { numericValue: 100 },
          'speed-index': { numericValue: 1500 },
          'final-screenshot': { details: { data: 'base64' } },
        },
        categories: { performance: { score: 0.6 } },
      },
    }

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (isPSICall(url)) return jsonResponse(borderlinePSI)
      if (isCrUXCall(url)) return jsonResponse({}, 500)
      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    expect(result.cwv_assessment).toBe('needs-improvement')
  })

  // -----------------------------------------------------------------------
  // CrUX origin fallback
  // -----------------------------------------------------------------------

  it('falls back to origin-level CrUX when URL-level returns 404', async () => {
    let cruxCallCount = 0

    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (isPSICall(url)) return jsonResponse(mockPSIResponse)

      if (isCrUXCall(url)) {
        cruxCallCount++
        const body = init?.body ? JSON.parse(init.body as string) : {}

        // First call is URL-level -- return 404
        if (body.url) {
          return jsonResponse({ error: 'NOT_FOUND' }, 404)
        }

        // Second call is origin-level -- return data
        if (body.origin) {
          return jsonResponse(mockCrUXResponse)
        }

        return jsonResponse({}, 500)
      }

      return jsonResponse({}, 500)
    }) as unknown as typeof fetch

    const result = await getPerformanceMetrics(TEST_URL)

    // Should have made two CrUX calls (URL-level 404, then origin-level)
    expect(cruxCallCount).toBe(2)
    expect(result.has_crux_data).toBe(true)
    expect(result.crux_origin_data).toBe(true)
    expect(result.crux_lcp_p75).toBe(2200)
  })
})
