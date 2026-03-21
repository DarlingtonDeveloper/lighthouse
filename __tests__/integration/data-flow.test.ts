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
import {
  detectTechStack,
  qualifyProspect,
  engineerValue,
  designArchitecture,
} from "@/lib/gemini"
import { storeInCortex } from "@/lib/cortex-store-pipeline"
import { entityTag } from "@/lib/utils"

const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_DOMAIN = "data-flow-test.com"
const TEST_URL = `https://${TEST_DOMAIN}`

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_HTML = `<html>
<head><script src="/_next/static/chunks/main.js"></script></head>
<body>
<div id="__next"><h1>Data Flow Test</h1></div>
<script id="__NEXT_DATA__" type="application/json">{"buildId":"test"}</script>
</body>
</html>`

const MOCK_HEADERS: Record<string, string> = {
  "x-powered-by": "Next.js",
  server: "nginx",
}

const mockTechStack: TechStack = {
  frontend_framework: {
    name: "Next.js",
    version: "14.2.0",
    confidence: "high",
    evidence: "/_next/ paths and __NEXT_DATA__ tag detected.",
    is_nextjs: true,
    nextjs_version: "14",
    uses_app_router: true,
    is_self_hosted: true,
  },
  rendering_analysis: {
    primary_strategy: "SSR",
    has_hydration_issues: false,
    has_stale_while_revalidate: false,
    client_side_data_fetching: false,
    evidence: "Server-rendered HTML with hydration scripts present.",
  },
  hosting: {
    name: "AWS ECS",
    confidence: "high",
    evidence: "x-amz-cf-id header indicates AWS hosting.",
    is_vercel: false,
    estimated_infra_complexity: "complex",
  },
  cdn: {
    name: "CloudFront",
    confidence: "high",
    evidence: "x-amz-cf-pop header detected.",
  },
  analytics: [
    { name: "Google Analytics 4", evidence: "gtag.js found in page source." },
  ],
  third_party_scripts: [
    {
      name: "Google Tag Manager",
      purpose: "Tag management",
      url_pattern: "googletagmanager.com/gtm.js",
      estimated_impact: "medium",
    },
  ],
  composable_maturity: "partially-decoupled",
  meta_framework_signals: ["Webpack chunks detected", "SWC compiler indicators"],
}

const mockPerformance: PerformanceMetrics = {
  lcp_ms: 3500,
  fid_ms: 100,
  cls: 0.08,
  fcp_ms: 1900,
  ttfb_ms: 900,
  tbt_ms: 250,
  inp_ms: null,
  speed_index_ms: 4200,
  performance_score: 55,
  crux_lcp_p75: 3400,
  crux_inp_p75: 190,
  crux_cls_p75: 0.06,
  crux_ttfb_p75: 850,
  has_crux_data: true,
  crux_origin_data: false,
  screenshot_base64: null,
  cwv_assessment: "needs-improvement",
}

const mockQualification: Qualification = {
  deal_score: 82,
  traffic_tier: "enterprise",
  migration_signals: {
    hiring_frontend: true,
    hiring_signals: ["Staff Frontend Engineer", "Platform Engineer"],
    mentions_headless: true,
    recent_replatform: false,
    evidence: "Active hiring for frontend platform roles with headless mentions.",
  },
  vercel_fit: {
    score: "strong",
    rationale: "Self-hosted Next.js on AWS with enterprise traffic is an ideal Vercel prospect.",
    already_on_vercel: false,
    blockers: ["Complex AWS infrastructure may slow migration"],
    accelerators: ["Already Next.js", "Enterprise traffic tier", "Active frontend hiring"],
  },
  company_profile: {
    estimated_size: "enterprise",
    industry_vertical: "e-commerce",
    b2b_or_b2c: "B2C",
  },
  recommended_action: "immediate-outreach",
  action_rationale: "Enterprise-tier Next.js prospect with strong migration signals and active hiring.",
}

const mockValueEngineering: ValueEngineering = {
  revenue_impact: {
    performance_improvement_potential: {
      current_lcp_ms: 3500,
      projected_lcp_ms: 1400,
      lcp_improvement_pct: 60,
      current_ttfb_ms: 900,
      projected_ttfb_ms: 45,
      ttfb_improvement_pct: 95,
    },
    conversion_rate_impact: {
      methodology: "Google/Deloitte Milliseconds Make Millions (2020)",
      estimated_conversion_lift_pct: 7.8,
      rationale: "2100ms LCP improvement for e-commerce yields significant conversion lift.",
    },
    qualitative_revenue_drivers: [
      "Improved Core Web Vitals SEO signal",
      "Reduced bounce rate from faster page loads",
      "Better mobile shopping experience",
    ],
  },
  tco_comparison: {
    current_stack_estimate: {
      hosting_monthly: "$1,200",
      cdn_monthly: "$400",
      ci_cd_monthly: "$200",
      monitoring_monthly: "$150",
      developer_infra_time_pct: 30,
      total_monthly_estimate: "$1,950",
      assumptions: "AWS ECS with CloudFront and full CI/CD pipeline.",
    },
    vercel_estimate: {
      plan_recommendation: "Enterprise",
      estimated_monthly: "$5,000",
      includes: ["Edge Network", "Analytics", "Image Optimization", "SLA", "SSO"],
      developer_infra_time_pct: 5,
    },
    savings_narrative: "While Vercel costs more in platform fees, the 25% reclaimed developer time at enterprise scale more than offsets the difference.",
  },
  migration: {
    complexity: "medium",
    estimated_effort: "3-4 sprints",
    approach: "incremental-migration",
    approach_rationale: "Complex AWS infrastructure requires gradual route-by-route migration.",
    migration_steps: [
      {
        step: 1,
        title: "Deploy Next.js to Vercel",
        description: "Connect the repository and deploy the existing Next.js app.",
        effort: "2 days",
        risk_level: "low",
      },
      {
        step: 2,
        title: "Edge Middleware reverse proxy",
        description: "Set up Edge Middleware to proxy non-migrated routes to AWS origin.",
        effort: "3 days",
        risk_level: "medium",
      },
      {
        step: 3,
        title: "Migrate routes incrementally",
        description: "Migrate routes one-by-one, validating performance at each step.",
        effort: "2-3 sprints",
        risk_level: "medium",
      },
    ],
    risks: [
      {
        risk: "Custom server features may require refactoring",
        mitigation: "Audit custom server usage and replace with Edge Middleware or API Routes.",
        severity: "medium",
      },
    ],
  },
  vercel_features: [
    {
      feature: "Image Optimization",
      relevance_to_prospect: "E-commerce product images are a major LCP contributor.",
      priority: "critical",
      category: "performance",
    },
  ],
  competitor_displacement: {
    current_provider: "AWS (ECS + CloudFront)",
    provider_category: "cloud-hosting",
    switching_cost: "medium",
    key_differentiators: ["Framework-native optimization", "Zero infrastructure management"],
    common_objections: [
      {
        objection: "We have invested heavily in AWS infrastructure.",
        response: "Vercel works alongside AWS -- your backend stays on AWS while Vercel handles frontend delivery.",
      },
    ],
  },
  talking_points: [
    {
      point: "Your engineers are spending 30% of their time on infrastructure that Vercel eliminates entirely.",
      audience: "engineering-leadership",
      supporting_data: "Detected 30% developer infrastructure time from tech stack analysis.",
    },
  ],
  closest_case_study: {
    company: "Under Armour",
    similarity_rationale: "Enterprise retail brand migrating from self-hosted Next.js on AWS to Vercel.",
    key_outcomes: ["50% faster page loads", "3x deployment frequency"],
  },
}

const mockArchitecture: Architecture = {
  current_architecture: {
    mermaid_diagram:
      "graph TD\n  User[User] --> CF[CloudFront CDN]\n  CF --> ALB[AWS ALB]\n  ALB --> ECS[ECS Next.js]\n  ECS --> DB[Database]",
    description: "Next.js on AWS ECS behind CloudFront and Application Load Balancer.",
    pain_points: ["Complex infrastructure stack", "High TTFB due to origin distance", "Manual scaling policies"],
  },
  target_architecture: {
    mermaid_diagram:
      "graph TD\n  User[User] --> Edge[Vercel Edge Network]\n  Edge --> NextJS[Next.js on Vercel]\n  NextJS --> DB[Database]",
    description: "Next.js deployed on Vercel Edge Network with direct database connections.",
    key_changes: [
      {
        component: "CDN + Origin",
        from: "CloudFront + ALB + ECS",
        to: "Vercel Edge Network",
        benefit: "Simplified stack with sub-50ms TTFB globally.",
      },
    ],
  },
  poc_proposal: {
    title: "data-flow-test.com - Homepage PoC on Vercel",
    scope: "Migrate homepage and category pages to Next.js on Vercel.",
    approach: "Edge Middleware reverse proxy for gradual migration.",
    duration: "2 weeks",
    success_criteria: [
      {
        metric: "TTFB",
        current_value: "900ms",
        target_value: "< 50ms",
      },
      {
        metric: "LCP",
        current_value: "3500ms",
        target_value: "< 1500ms",
      },
    ],
    required_from_prospect: ["Git repo access", "Environment variables", "DNS access"],
    vercel_resources: ["SA engineering time", "Enterprise trial account"],
    risk_mitigation: "Reverse proxy ensures zero disruption. Instant rollback via DNS.",
  },
}

// ---------------------------------------------------------------------------
// Mock fetch for Cortex and careers pages
// ---------------------------------------------------------------------------

function createMockFetch() {
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url

    // Cortex search - returns empty results
    if (url.includes("/search")) {
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ results: [] })),
        json: () => Promise.resolve({ results: [] }),
        headers: new Map<string, string>(),
      }
    }

    // Cortex store - returns success
    if (url.includes("localhost:9091") || url.includes("/nodes")) {
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ id: "node-stored" })),
        json: () => Promise.resolve({ id: "node-stored" }),
        headers: new Map<string, string>(),
      }
    }

    // Careers / jobs pages
    if (url.includes("/careers") || url.includes("/jobs")) {
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve("<html><body><h1>Careers</h1></body></html>"),
        json: () => Promise.resolve({}),
        headers: new Map<string, string>(),
      }
    }

    // Default: 404
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
// Tests
// ---------------------------------------------------------------------------

describe("Data flow between pipeline modules", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = createMockFetch()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Test 1: Tech stack output is valid input for qualification
  // -------------------------------------------------------------------------

  it("tech stack detection output is valid input for qualification", async () => {
    // Setup: detectTechStack returns mockTechStack, qualifyProspect returns mockQualification
    mockGenerateObject
      .mockResolvedValueOnce({ object: mockTechStack })
      .mockResolvedValueOnce({ object: mockQualification })

    // Run detectTechStack
    const techStack = await detectTechStack(MOCK_HTML, MOCK_HEADERS, TEST_DOMAIN)

    // Verify the output has the shape required by qualifyProspect
    expect(techStack).toHaveProperty("frontend_framework")
    expect(techStack).toHaveProperty("frontend_framework.name")
    expect(techStack).toHaveProperty("frontend_framework.is_nextjs")
    expect(techStack).toHaveProperty("hosting")
    expect(techStack).toHaveProperty("hosting.name")
    expect(techStack).toHaveProperty("hosting.is_vercel")
    expect(techStack).toHaveProperty("rendering_analysis")
    expect(techStack).toHaveProperty("composable_maturity")

    // Run qualifyProspect with the tech stack output -- it should succeed
    const qualification = await qualifyProspect(TEST_DOMAIN, techStack, mockPerformance)

    expect(qualification).not.toBeNull()
    expect(qualification).toHaveProperty("deal_score")
    expect(qualification).toHaveProperty("recommended_action")
    expect(qualification).toHaveProperty("vercel_fit")
    expect(typeof qualification.deal_score).toBe("number")
  })

  // -------------------------------------------------------------------------
  // Test 2: Qualification output feeds into value engineering
  // -------------------------------------------------------------------------

  it("qualification output feeds into value engineering", async () => {
    // Setup: engineerValue returns mockValueEngineering
    mockGenerateObject.mockResolvedValueOnce({ object: mockValueEngineering })

    // Run engineerValue with real qualification data
    const valueEngineering = await engineerValue(
      TEST_DOMAIN,
      mockTechStack,
      mockPerformance,
      mockQualification,
      ""
    )

    expect(valueEngineering).not.toBeNull()

    // Verify generateObject was called with data containing the qualification data
    const callArgs = mockGenerateObject.mock.calls[0][0]
    const prompt = callArgs.prompt as string

    // The prompt should contain the qualification data (serialized as JSON)
    expect(prompt).toContain(String(mockQualification.deal_score))
    expect(prompt).toContain(mockQualification.recommended_action)
    expect(prompt).toContain(mockQualification.company_profile.industry_vertical)
  })

  // -------------------------------------------------------------------------
  // Test 3: Value engineering output feeds into architecture design
  // -------------------------------------------------------------------------

  it("value engineering output feeds into architecture design", async () => {
    // Setup: designArchitecture returns mockArchitecture
    mockGenerateObject.mockResolvedValueOnce({ object: mockArchitecture })

    // Run designArchitecture with value engineering output
    const architecture = await designArchitecture(
      TEST_DOMAIN,
      mockTechStack,
      mockPerformance,
      mockValueEngineering
    )

    expect(architecture).not.toBeNull()
    expect(architecture).toHaveProperty("current_architecture")
    expect(architecture).toHaveProperty("target_architecture")
    expect(architecture).toHaveProperty("poc_proposal")

    // Verify the Gemini prompt received the value engineering data
    const callArgs = mockGenerateObject.mock.calls[0][0]
    const prompt = callArgs.prompt as string

    expect(prompt).toContain(mockValueEngineering.migration.approach)
    expect(prompt).toContain(mockValueEngineering.migration.complexity)
    expect(prompt).toContain(mockValueEngineering.competitor_displacement.current_provider)
  })

  // -------------------------------------------------------------------------
  // Test 4: storeInCortex handles all pipeline outputs together
  // -------------------------------------------------------------------------

  it("storeInCortex handles all pipeline outputs together", async () => {
    await storeInCortex(TEST_DOMAIN, TEST_URL, {
      techStack: mockTechStack,
      performance: mockPerformance,
      qualification: mockQualification,
      valueEngineering: mockValueEngineering,
      architecture: mockArchitecture,
    })

    // Count how many times fetch was called for Cortex store operations
    // (calls to localhost:9091/nodes with POST method)
    const cortexStoreCalls = mockFetch.mock.calls.filter(
      (call: [string | URL | Request, RequestInit?]) => {
        const url = typeof call[0] === "string" ? call[0] : call[0] instanceof URL ? call[0].toString() : (call[0] as Request).url
        const init = call[1]
        return url.includes("/nodes") && init?.method === "POST"
      }
    )

    // Expected node kinds:
    // 1. prospect
    // 2. stack-detection
    // 3. performance-snapshot
    // 4. qualification-score
    // 5. value-proposition
    // 6. poc-scope
    // 7. case-study-match
    // 8+ migration-pattern (one per migration step -- 3 steps in mockValueEngineering)
    const expectedBaseNodes = 7
    const expectedMigrationSteps = mockValueEngineering.migration.migration_steps.length
    const expectedTotal = expectedBaseNodes + expectedMigrationSteps

    expect(cortexStoreCalls.length).toBe(expectedTotal)

    // Verify all expected node kinds are present in the stored data
    const storedKinds = cortexStoreCalls.map((call: [string | URL | Request, RequestInit?]) => {
      const body = JSON.parse(call[1]?.body as string)
      return body.kind
    })

    expect(storedKinds).toContain("prospect")
    expect(storedKinds).toContain("stack-detection")
    expect(storedKinds).toContain("performance-snapshot")
    expect(storedKinds).toContain("qualification-score")
    expect(storedKinds).toContain("value-proposition")
    expect(storedKinds).toContain("poc-scope")
    expect(storedKinds).toContain("case-study-match")
    expect(storedKinds.filter((k: string) => k === "migration-pattern").length).toBe(
      expectedMigrationSteps
    )
  })

  // -------------------------------------------------------------------------
  // Test 5: Entity tags are consistent across pipeline
  // -------------------------------------------------------------------------

  it("entity tags are consistent across pipeline", async () => {
    const domain = "example.com"
    const tag = entityTag(domain)

    // Verify entityTag produces a stable, deterministic result
    expect(tag).toBe("entity-example-com")
    expect(entityTag(domain)).toBe(tag) // Same input -> same output

    // Verify dots are replaced with hyphens and prefixed
    expect(entityTag("sub.domain.example.com")).toBe("entity-sub-domain-example-com")

    // Store data and verify all nodes use the same entity tag
    const storedMockFetch = createMockFetch()
    vi.stubGlobal("fetch", storedMockFetch)

    await storeInCortex(domain, `https://${domain}`, {
      techStack: mockTechStack,
      performance: mockPerformance,
      qualification: mockQualification,
      valueEngineering: mockValueEngineering,
      architecture: mockArchitecture,
    })

    // Extract all tags arrays from stored nodes
    const cortexStoreCalls = storedMockFetch.mock.calls.filter(
      (call: [string | URL | Request, RequestInit?]) => {
        const url = typeof call[0] === "string" ? call[0] : call[0] instanceof URL ? call[0].toString() : (call[0] as Request).url
        const init = call[1]
        return url.includes("/nodes") && init?.method === "POST"
      }
    )

    const expectedTag = entityTag(domain)

    for (const call of cortexStoreCalls) {
      const body = JSON.parse((call as [string, RequestInit])[1]?.body as string)
      expect(body.tags).toContain(expectedTag)
    }

    // Verify that every single node carries the same entity tag
    const allTags = cortexStoreCalls.map((call: [string | URL | Request, RequestInit?]) => {
      const body = JSON.parse((call as [string, RequestInit])[1]?.body as string)
      return body.tags
    })

    for (const tags of allTags) {
      expect(tags).toEqual(expect.arrayContaining([expectedTag]))
    }
  })
})
