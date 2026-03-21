import { vi } from "vitest"
import type { TechStack, Qualification, ValueEngineering, Architecture } from "@/lib/schemas"
import type { PerformanceMetrics } from "@/lib/pagespeed"

// ---------------------------------------------------------------------------
// Mock external boundaries BEFORE importing any module that uses them
// ---------------------------------------------------------------------------

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}))

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mock-model"),
}))

import { generateObject } from "ai"
import { fetchPage } from "@/lib/fetcher"
import {
  detectTechStack,
  qualifyProspect,
  engineerValue,
  designArchitecture,
} from "@/lib/gemini"
import { getPerformanceMetrics } from "@/lib/pagespeed"
import { storeInCortex } from "@/lib/cortex-store-pipeline"

const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_DOMAIN = "test-site.com"
const TEST_URL = `https://${TEST_DOMAIN}`

// ---------------------------------------------------------------------------
// Mock HTML with Next.js signals
// ---------------------------------------------------------------------------

const MOCK_HTML = `<html>
<head><script src="/_next/static/chunks/main.js"></script></head>
<body>
<div id="__next"><h1>Test Site</h1></div>
<script id="__NEXT_DATA__" type="application/json">{"buildId":"test"}</script>
</body>
</html>`

const MOCK_HEADERS: Record<string, string> = {
  "x-powered-by": "Next.js",
  server: "nginx",
}

const MOCK_CAREERS_HTML = `<html><body>
<h1>Careers at Test Site</h1>
<div class="job-listing">
  <h2>Senior Frontend Engineer (Next.js)</h2>
  <p>We are looking for a senior frontend engineer to help migrate our platform.</p>
</div>
</body></html>`

// ---------------------------------------------------------------------------
// Mock Gemini response fixtures
// ---------------------------------------------------------------------------

const mockTechStack: TechStack = {
  frontend_framework: {
    name: "Next.js",
    version: "14.1.0",
    confidence: "high",
    evidence: "Detected /_next/ asset paths and __NEXT_DATA__ script tag.",
    is_nextjs: true,
    nextjs_version: "14",
    uses_app_router: false,
    is_self_hosted: true,
  },
  rendering_analysis: {
    primary_strategy: "SSR",
    has_hydration_issues: false,
    has_stale_while_revalidate: false,
    client_side_data_fetching: false,
    evidence: "Full server-rendered HTML with React hydration scripts.",
  },
  hosting: {
    name: "nginx",
    confidence: "medium",
    evidence: "server: nginx header present.",
    is_vercel: false,
    estimated_infra_complexity: "moderate",
  },
  cdn: {
    name: "none",
    confidence: "low",
    evidence: "No CDN headers detected.",
  },
  analytics: [
    { name: "Google Analytics 4", evidence: "gtag.js script detected." },
  ],
  third_party_scripts: [],
  composable_maturity: "partially-decoupled",
  meta_framework_signals: ["Webpack chunks detected"],
}

const mockQualification: Qualification = {
  deal_score: 75,
  traffic_tier: "mid-market",
  migration_signals: {
    hiring_frontend: true,
    hiring_signals: ["Senior Frontend Engineer (Next.js)"],
    mentions_headless: false,
    recent_replatform: false,
    evidence: "Hiring for Next.js frontend roles suggests migration intent.",
  },
  vercel_fit: {
    score: "strong",
    rationale: "Self-hosted Next.js is the highest-value Vercel prospect signal.",
    already_on_vercel: false,
    blockers: [],
    accelerators: ["Self-hosted Next.js", "Hiring frontend engineers"],
  },
  company_profile: {
    estimated_size: "mid-market",
    industry_vertical: "technology",
    b2b_or_b2c: "B2B",
  },
  recommended_action: "schedule-discovery-call",
  action_rationale:
    "Self-hosted Next.js with active frontend hiring signals a strong migration opportunity.",
}

const mockValueEngineering: ValueEngineering = {
  revenue_impact: {
    performance_improvement_potential: {
      current_lcp_ms: 3200,
      projected_lcp_ms: 1200,
      lcp_improvement_pct: 62,
      current_ttfb_ms: 800,
      projected_ttfb_ms: 50,
      ttfb_improvement_pct: 94,
    },
    conversion_rate_impact: {
      methodology: "Google/Deloitte Milliseconds Make Millions study",
      estimated_conversion_lift_pct: 5.2,
      rationale: "Projected 2000ms LCP improvement yields measurable conversion gain.",
    },
    qualitative_revenue_drivers: ["Improved SEO rankings", "Better brand perception"],
  },
  tco_comparison: {
    current_stack_estimate: {
      hosting_monthly: "$500",
      cdn_monthly: "$200",
      ci_cd_monthly: "$100",
      monitoring_monthly: "$50",
      developer_infra_time_pct: 25,
      total_monthly_estimate: "$850",
      assumptions: "Based on detected nginx self-hosted setup.",
    },
    vercel_estimate: {
      plan_recommendation: "Enterprise",
      estimated_monthly: "$3,000",
      includes: ["Edge Network", "Analytics", "Image Optimization"],
      developer_infra_time_pct: 5,
    },
    savings_narrative: "Developer time savings offset the platform cost.",
  },
  migration: {
    complexity: "low",
    estimated_effort: "1-2 sprints",
    approach: "direct-deploy",
    approach_rationale: "Already Next.js, can connect Git repo and deploy directly.",
    migration_steps: [
      {
        step: 1,
        title: "Connect repository to Vercel",
        description: "Link Git repo and configure environment variables.",
        effort: "1 day",
        risk_level: "low",
      },
      {
        step: 2,
        title: "Configure DNS and domains",
        description: "Point DNS to Vercel and configure custom domains.",
        effort: "1 day",
        risk_level: "low",
      },
    ],
    risks: [
      {
        risk: "Custom server features may not be supported",
        mitigation: "Audit custom server usage and migrate to Edge Middleware.",
        severity: "medium",
      },
    ],
  },
  vercel_features: [
    {
      feature: "Edge Functions",
      relevance_to_prospect: "Replace nginx routing with edge-native middleware.",
      priority: "high",
      category: "performance",
    },
  ],
  competitor_displacement: {
    current_provider: "Self-hosted (nginx)",
    provider_category: "self-hosted",
    switching_cost: "low",
    key_differentiators: ["Zero infrastructure management", "Global edge delivery"],
    common_objections: [
      {
        objection: "We like controlling our own servers.",
        response: "Vercel gives you full control over configuration with none of the operational burden.",
      },
    ],
  },
  talking_points: [
    {
      point: "Deploy on merge with instant rollbacks -- no more deployment anxiety.",
      audience: "engineering",
      supporting_data: "Vercel supports atomic deployments with instant rollback capability.",
    },
  ],
  closest_case_study: {
    company: "Sonos",
    similarity_rationale: "Similar self-hosted Next.js migration with significant performance gains.",
    key_outcomes: ["60% LCP improvement", "4x faster deployments"],
  },
}

const mockArchitecture: Architecture = {
  current_architecture: {
    mermaid_diagram: "graph TD\n  User[User] --> Nginx[nginx]\n  Nginx --> NextJS[Next.js SSR]",
    description: "Self-hosted Next.js behind nginx reverse proxy.",
    pain_points: ["Manual scaling", "No edge caching", "Slow TTFB globally"],
  },
  target_architecture: {
    mermaid_diagram:
      "graph TD\n  User[User] --> Edge[Vercel Edge Network]\n  Edge --> NextJS[Next.js on Vercel]",
    description: "Next.js deployed on Vercel with global edge delivery.",
    key_changes: [
      {
        component: "Frontend Delivery",
        from: "nginx + self-hosted Next.js",
        to: "Vercel Edge Network",
        benefit: "Sub-50ms TTFB globally with automatic scaling.",
      },
    ],
  },
  poc_proposal: {
    title: "test-site.com - Vercel PoC: Homepage Migration",
    scope: "Migrate homepage to Vercel, proxy all other routes to existing origin.",
    approach: "Edge Middleware reverse proxy pattern.",
    duration: "1-2 weeks",
    success_criteria: [
      {
        metric: "TTFB",
        current_value: "800ms",
        target_value: "< 100ms",
      },
    ],
    required_from_prospect: ["Source code access", "DNS access"],
    vercel_resources: ["SA time", "Enterprise trial"],
    risk_mitigation: "Instant rollback via DNS change.",
  },
}

// ---------------------------------------------------------------------------
// Mock PSI response
// ---------------------------------------------------------------------------

const MOCK_PSI_RESPONSE = {
  lighthouseResult: {
    audits: {
      "largest-contentful-paint": { numericValue: 3200 },
      "max-potential-fid": { numericValue: 120 },
      "cumulative-layout-shift": { numericValue: 0.05 },
      "first-contentful-paint": { numericValue: 1800 },
      "server-response-time": { numericValue: 800 },
      "total-blocking-time": { numericValue: 200 },
      "speed-index": { numericValue: 4100 },
      "final-screenshot": { details: { data: "base64-screenshot-data" } },
    },
    categories: {
      performance: { score: 0.62 },
    },
  },
}

// ---------------------------------------------------------------------------
// Mock CrUX response
// ---------------------------------------------------------------------------

const MOCK_CRUX_RESPONSE = {
  record: {
    metrics: {
      largest_contentful_paint: { percentiles: { p75: 3100 } },
      interaction_to_next_paint: { percentiles: { p75: 180 } },
      cumulative_layout_shift: { percentiles: { p75: 8 } },
      experimental_time_to_first_byte: { percentiles: { p75: 750 } },
    },
  },
}

// ---------------------------------------------------------------------------
// Comprehensive mock fetch router
// ---------------------------------------------------------------------------

function createMockFetch(overrides?: {
  domainFails?: boolean
  cortexFails?: boolean
}) {
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url

    // --- Check external API URLs FIRST (before domain check, because
    //     API URLs like PSI embed the target domain in query params) ---

    // PageSpeed Insights API
    if (url.includes("pagespeedonline")) {
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(MOCK_PSI_RESPONSE)),
        json: () => Promise.resolve(MOCK_PSI_RESPONSE),
        headers: new Map<string, string>(),
      }
    }

    // Chrome UX Report API
    if (url.includes("chromeuxreport")) {
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(MOCK_CRUX_RESPONSE)),
        json: () => Promise.resolve(MOCK_CRUX_RESPONSE),
        headers: new Map<string, string>(),
      }
    }

    // Cortex API (store + search)
    if (url.includes("localhost:9091") || url.includes(process.env.CORTEX_URL ?? "__no_cortex__")) {
      if (overrides?.cortexFails) {
        return {
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
          json: () => Promise.reject(new Error("500")),
          headers: new Map<string, string>(),
        }
      }

      // Search endpoint returns empty results
      if (url.includes("/search")) {
        return {
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ results: [] })),
          json: () => Promise.resolve({ results: [] }),
          headers: new Map<string, string>(),
        }
      }

      // Store endpoint returns success
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ id: "node-123" })),
        json: () => Promise.resolve({ id: "node-123" }),
        headers: new Map<string, string>(),
      }
    }

    // --- Now check domain-specific URLs ---

    // Careers / jobs pages (check before generic domain match)
    if (url.includes("/careers") || url.includes("/jobs")) {
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(MOCK_CAREERS_HTML),
        json: () => Promise.resolve({}),
        headers: new Map<string, string>(),
      }
    }

    // Domain page fetch (main site HTML)
    if (url.includes(TEST_DOMAIN)) {
      if (overrides?.domainFails) {
        throw new TypeError("fetch failed")
      }
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(MOCK_HTML),
        json: () => Promise.resolve({}),
        headers: new Map(Object.entries(MOCK_HEADERS)),
      }
    }

    // All other URLs: 404
    return {
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not Found"),
      json: () => Promise.reject(new Error("404")),
      headers: new Map<string, string>(),
    }
  })
}

// ---------------------------------------------------------------------------
// Setup generateObject to return valid mock objects in sequence
// ---------------------------------------------------------------------------

function setupGenerateObjectMocks() {
  mockGenerateObject
    // 1st call: detectTechStack
    .mockResolvedValueOnce({ object: mockTechStack })
    // 2nd call: qualifyProspect
    .mockResolvedValueOnce({ object: mockQualification })
    // 3rd call: engineerValue
    .mockResolvedValueOnce({ object: mockValueEngineering })
    // 4th call: designArchitecture
    .mockResolvedValueOnce({ object: mockArchitecture })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Full analysis pipeline integration", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PSI_API_KEY = "test-psi-key"
    process.env.CRUX_API_KEY = "test-crux-key"
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.PSI_API_KEY
    delete process.env.CRUX_API_KEY
  })

  // -------------------------------------------------------------------------
  // Test 1: Full pipeline produces complete analysis
  // -------------------------------------------------------------------------

  it("full pipeline produces complete analysis", async () => {
    mockFetch = createMockFetch()
    vi.stubGlobal("fetch", mockFetch)
    setupGenerateObjectMocks()

    // Stage 1: Fetch page
    const { html, headers } = await fetchPage(TEST_URL)
    expect(html).toBeTruthy()
    expect(html).toContain("__NEXT_DATA__")
    expect(headers).toBeTruthy()

    // Stage 2: Tech stack + performance in parallel
    const [techStack, performance] = await Promise.all([
      detectTechStack(html, headers, TEST_DOMAIN),
      getPerformanceMetrics(TEST_URL),
    ])
    expect(techStack).not.toBeNull()
    expect(techStack.frontend_framework.name).toBe("Next.js")
    expect(techStack.frontend_framework.is_self_hosted).toBe(true)
    expect(performance).not.toBeNull()
    expect(performance.performance_score).toBe(62)
    expect(performance.has_crux_data).toBe(true)

    // Stage 3: Qualification
    const qualification = await qualifyProspect(TEST_DOMAIN, techStack, performance)
    expect(qualification).not.toBeNull()
    expect(qualification.deal_score).toBe(75)
    expect(qualification.recommended_action).toBe("schedule-discovery-call")

    // Stage 4: Value engineering
    const valueEngineering = await engineerValue(
      TEST_DOMAIN,
      techStack,
      performance,
      qualification,
      "" // empty priorPatterns
    )
    expect(valueEngineering).not.toBeNull()
    expect(valueEngineering.migration.approach).toBe("direct-deploy")
    expect(valueEngineering.migration.complexity).toBe("low")

    // Stage 5: Architecture design
    const architecture = await designArchitecture(
      TEST_DOMAIN,
      techStack,
      performance,
      valueEngineering
    )
    expect(architecture).not.toBeNull()
    expect(architecture.poc_proposal.title).toBeTruthy()

    // Stage 6: Store in Cortex
    await expect(
      storeInCortex(TEST_DOMAIN, TEST_URL, {
        techStack,
        performance,
        qualification,
        valueEngineering,
        architecture,
      })
    ).resolves.not.toThrow()

    // Verify the final data has all required top-level keys
    const finalData = {
      techStack,
      performance,
      qualification,
      valueEngineering,
      architecture,
    }

    expect(finalData).toHaveProperty("techStack")
    expect(finalData).toHaveProperty("performance")
    expect(finalData).toHaveProperty("qualification")
    expect(finalData).toHaveProperty("valueEngineering")
    expect(finalData).toHaveProperty("architecture")

    // Verify generateObject was called exactly 4 times (techStack, qualification, value, architecture)
    expect(mockGenerateObject).toHaveBeenCalledTimes(4)
  })

  // -------------------------------------------------------------------------
  // Test 2: Pipeline handles fetch failure gracefully
  // -------------------------------------------------------------------------

  it("pipeline handles fetch failure gracefully", async () => {
    mockFetch = createMockFetch({ domainFails: true })
    vi.stubGlobal("fetch", mockFetch)

    // detectTechStack with empty html should still return a result
    mockGenerateObject.mockResolvedValueOnce({ object: mockTechStack })

    // fetchPage should return empty result on failure
    const { html, headers } = await fetchPage(TEST_URL)
    expect(html).toBe("")
    expect(headers).toEqual({})

    // detectTechStack with empty html should still work (Gemini analyses what it can)
    const techStack = await detectTechStack(html, headers, TEST_DOMAIN)
    expect(techStack).not.toBeNull()
    expect(techStack.frontend_framework).toBeDefined()

    // The pipeline should not throw at any point
    expect(() => techStack).not.toThrow()
  })

  // -------------------------------------------------------------------------
  // Test 3: Pipeline handles Gemini failure gracefully
  // -------------------------------------------------------------------------

  it("pipeline handles Gemini failure gracefully", async () => {
    mockFetch = createMockFetch()
    vi.stubGlobal("fetch", mockFetch)

    // All generateObject calls throw
    mockGenerateObject.mockRejectedValue(new Error("Gemini API quota exceeded"))

    // Stage 1: Fetch page still works (no Gemini dependency)
    const { html, headers } = await fetchPage(TEST_URL)
    expect(html).toBeTruthy()

    // Stage 2: detectTechStack returns degraded result
    const techStack = await detectTechStack(html, headers, TEST_DOMAIN)
    expect(techStack).not.toBeNull()
    expect(techStack.frontend_framework.name).toBe("detection-failed")
    expect(techStack.frontend_framework.confidence).toBe("low")

    // Stage 2: getPerformanceMetrics still works (no Gemini dependency)
    const performance = await getPerformanceMetrics(TEST_URL)
    expect(performance).not.toBeNull()

    // Stage 3: qualifyProspect returns degraded result
    const qualification = await qualifyProspect(TEST_DOMAIN, techStack, performance)
    expect(qualification).not.toBeNull()
    expect(qualification.deal_score).toBe(0)
    expect(qualification.recommended_action).toBe("deprioritise")

    // Stage 4: engineerValue returns degraded result
    const valueEngineering = await engineerValue(
      TEST_DOMAIN,
      techStack,
      performance,
      qualification,
      ""
    )
    expect(valueEngineering).not.toBeNull()
    expect(valueEngineering.migration.complexity).toBe("medium")

    // Stage 5: designArchitecture returns degraded result
    const architecture = await designArchitecture(
      TEST_DOMAIN,
      techStack,
      performance,
      valueEngineering
    )
    expect(architecture).not.toBeNull()
    expect(architecture.current_architecture.mermaid_diagram).toContain("graph TD")
    expect(architecture.poc_proposal).toBeDefined()

    // Stage 6: storeInCortex should not throw even with degraded data
    await expect(
      storeInCortex(TEST_DOMAIN, TEST_URL, {
        techStack,
        performance,
        qualification,
        valueEngineering,
        architecture,
      })
    ).resolves.not.toThrow()
  })

  // -------------------------------------------------------------------------
  // Test 4: Pipeline handles Cortex failure gracefully
  // -------------------------------------------------------------------------

  it("pipeline handles Cortex failure gracefully", async () => {
    mockFetch = createMockFetch({ cortexFails: true })
    vi.stubGlobal("fetch", mockFetch)
    setupGenerateObjectMocks()

    // Run the full pipeline
    const { html, headers } = await fetchPage(TEST_URL)
    expect(html).toBeTruthy()

    const [techStack, performance] = await Promise.all([
      detectTechStack(html, headers, TEST_DOMAIN),
      getPerformanceMetrics(TEST_URL),
    ])

    const qualification = await qualifyProspect(TEST_DOMAIN, techStack, performance)
    const valueEngineering = await engineerValue(
      TEST_DOMAIN,
      techStack,
      performance,
      qualification,
      ""
    )
    const architecture = await designArchitecture(
      TEST_DOMAIN,
      techStack,
      performance,
      valueEngineering
    )

    // Cortex is failing with 500, but storeInCortex should not throw
    await expect(
      storeInCortex(TEST_DOMAIN, TEST_URL, {
        techStack,
        performance,
        qualification,
        valueEngineering,
        architecture,
      })
    ).resolves.not.toThrow()

    // Analysis results should still be valid despite Cortex failure
    expect(techStack.frontend_framework.name).toBe("Next.js")
    expect(qualification.deal_score).toBe(75)
    expect(valueEngineering.migration.approach).toBe("direct-deploy")
    expect(architecture.poc_proposal.title).toBeTruthy()
  })
})
