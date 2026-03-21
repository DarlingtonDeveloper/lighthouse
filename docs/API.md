# Lighthouse API Reference

This document covers every HTTP endpoint exposed by the Lighthouse application. All endpoints are implemented as Next.js App Router route handlers under `app/api/`.

Base URL: `http://localhost:3000` (development) or your deployed Vercel URL.

---

## Table of Contents

- [POST /api/discover](#post-apidiscover)
- [GET /api/prospects](#get-apiprospects)
- [GET /api/prospects/\[domain\]](#get-apiprospectsdomain)
- [GET /api/briefing/\[domain\]](#get-apibriefingdomain)
- [Data Models](#data-models)
  - [TechStack](#techstack)
  - [PerformanceMetrics](#performancemetrics)
  - [Qualification](#qualification)
  - [ValueEngineering](#valueengineering)
  - [Architecture](#architecture)
  - [CortexNode](#cortexnode)

---

## POST /api/discover

Runs the full Lighthouse analysis pipeline against a given URL and streams results back to the client in real time using Server-Sent Events (SSE).

### Request

**Content-Type:** `application/json`

```typescript
interface DiscoverRequest {
  url: string // Fully qualified HTTPS URL to analyse
}
```

The URL must be a valid, publicly routable HTTPS address. Localhost, private IP ranges, `.local`, and `.internal` TLDs are rejected.

### Response

**Content-Type:** `text/event-stream`

The response is a Server-Sent Events stream. Each event is a single `data:` line containing a JSON object with `stage` and `data` fields:

```
data: {"stage":"<stage_name>","data":{...}}
```

Events are separated by a double newline (`\n\n`).

### Pipeline Stages

Events are emitted in the following order. Each stage sends a `"running"` event when it begins and a `"complete"` event with results when it finishes.

| Stage | Description | Parallel? |
|-------|-------------|-----------|
| `fetch` | Fetches the target page HTML and response headers | No |
| `techstack` | AI-powered tech stack detection via Gemini | Yes (with `performance`) |
| `performance` | PageSpeed Insights lab data + CrUX field data | Yes (with `techstack`) |
| `qualification` | AI-powered sales qualification scoring | No (depends on techstack + performance) |
| `value` | AI-powered value engineering analysis | No (depends on qualification) |
| `architecture` | AI-powered architecture diagrams and PoC proposal | No (depends on value) |
| `complete` | Final aggregated result with all pipeline outputs | N/A |
| `error` | Emitted if the pipeline encounters an unrecoverable error | N/A |

### Stage Event Format

**Running event** (emitted when a stage starts):

```json
{
  "stage": "fetch",
  "data": { "status": "running" }
}
```

**Complete event** (emitted when a stage finishes):

```json
{
  "stage": "techstack",
  "data": { "status": "complete", "data": { /* TechStack object */ } }
}
```

**Complete event** (final aggregated result):

```json
{
  "stage": "complete",
  "data": {
    "domain": "example.com",
    "url": "https://example.com",
    "techStack": { /* TechStack */ },
    "performance": { /* PerformanceMetrics */ },
    "qualification": { /* Qualification */ },
    "valueEngineering": { /* ValueEngineering */ },
    "architecture": { /* Architecture */ },
    "timestamp": "2026-03-21T12:00:00.000Z"
  }
}
```

**Error event**:

```json
{
  "stage": "error",
  "data": { "message": "An unknown error occurred" }
}
```

### Example

```bash
curl -X POST http://localhost:3000/api/discover \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' \
  --no-buffer
```

Example streamed output (abbreviated):

```
data: {"stage":"fetch","data":{"status":"running"}}

data: {"stage":"fetch","data":{"status":"complete"}}

data: {"stage":"techstack","data":{"status":"running"}}

data: {"stage":"performance","data":{"status":"running"}}

data: {"stage":"techstack","data":{"status":"complete","data":{"frontend_framework":{"name":"Next.js","version":"14","confidence":"high","evidence":"/_next/ asset paths detected","is_nextjs":true,"nextjs_version":"14","uses_app_router":true,"is_self_hosted":true},"hosting":{"name":"AWS","confidence":"high","evidence":"x-amz-cf-id header present","is_vercel":false,"estimated_infra_complexity":"moderate"},"cdn":{"name":"CloudFront","confidence":"high","evidence":"x-amz-cf-pop header"},"composable_maturity":"partially-decoupled"}}}

data: {"stage":"performance","data":{"status":"complete","data":{"lcp_ms":2840,"ttfb_ms":620,"cls":0.05,"performance_score":62,"cwv_assessment":"needs-improvement"}}}

data: {"stage":"complete","data":{"domain":"example.com","url":"https://example.com","techStack":{...},"performance":{...},"qualification":{...},"valueEngineering":{...},"architecture":{...},"timestamp":"2026-03-21T12:00:00.000Z"}}
```

### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Invalid or non-public URL. Please provide a valid HTTPS URL." }` | The URL is not HTTPS, is a private/reserved IP, or cannot be parsed |

### Notes

- **Timeout**: The route is configured with `maxDuration = 60` seconds. The entire pipeline must complete within this window.
- **Background storage**: After the stream closes, the server uses Vercel's `waitUntil` to persist all analysis results to Cortex in the background. This does not block the response. The function instance stays alive via Fluid Compute to complete the writes.
- **Degraded results**: If any individual Gemini call fails, the pipeline continues with a degraded fallback result for that stage rather than crashing. The `complete` event is still emitted.
- **Parallel stages**: The `techstack` and `performance` stages run concurrently via `Promise.all`. All other stages run sequentially because they depend on prior outputs.

---

## GET /api/prospects

Lists all previously analysed prospects stored in Cortex.

### Request

No request body or query parameters.

### Response

**Content-Type:** `application/json`

```typescript
interface ProspectsResponse {
  nodes: CortexNode[]
}
```

Returns up to 50 nodes of kind `"prospect"`, ordered by Cortex's default relevance. Each node's `metadata` field contains summary fields for quick display (deal score, Vercel fit, industry, recommended action).

### Example

```bash
curl http://localhost:3000/api/prospects
```

Example response:

```json
{
  "nodes": [
    {
      "kind": "prospect",
      "title": "example.com",
      "body": "Prospect example.com -- deal score 72/100, Vercel fit strong, recommended action: schedule-discovery-call.",
      "importance": 0.9,
      "tags": ["entity-example-com", "prospect"],
      "metadata": {
        "url": "https://example.com",
        "deal_score": 72,
        "vercel_fit": "strong",
        "traffic_tier": "mid-market",
        "industry": "e-commerce",
        "recommended_action": "schedule-discovery-call"
      }
    }
    /* ... more prospect nodes */
  ]
}
```

### Error Responses

If Cortex is unreachable, the endpoint returns an empty list rather than failing:

```json
{ "nodes": [] }
```

### Notes

- The endpoint queries Cortex for nodes with `kind = "prospect"` and a limit of 50.
- All Cortex calls use a 5-second timeout via `AbortSignal.timeout`.

---

## GET /api/prospects/[domain]

Retrieves the full analysis for a specific prospect domain, with all data grouped by Cortex node kind.

### Request

**Path parameter:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `domain` | `string` | The domain to look up (e.g., `example.com`) |

### Response

**Content-Type:** `application/json`

```typescript
interface ProspectDetailResponse {
  domain: string
  prospect: CortexNode | null          // kind: "prospect"
  tech_stack: CortexNode | null        // kind: "stack-detection"
  performance: CortexNode | null       // kind: "performance-snapshot"
  qualification: CortexNode | null     // kind: "qualification-score"
  value_proposition: CortexNode | null // kind: "value-proposition"
  architecture: CortexNode | null      // kind: "poc-scope"
  case_study_match: CortexNode | null  // kind: "case-study-match"
  migration_steps: CortexNode[]        // kind: "migration-pattern" (multiple)
}
```

Each node's `body` field contains a JSON-serialised version of the corresponding data model (TechStack, PerformanceMetrics, Qualification, ValueEngineering, or Architecture). Parse it with `JSON.parse()` to access the typed object.

### Example

```bash
curl http://localhost:3000/api/prospects/example.com
```

Example response (abbreviated):

```json
{
  "domain": "example.com",
  "prospect": {
    "kind": "prospect",
    "title": "example.com",
    "body": "Prospect example.com -- deal score 72/100, Vercel fit strong, recommended action: schedule-discovery-call.",
    "importance": 0.9,
    "tags": ["entity-example-com", "prospect"],
    "metadata": {
      "url": "https://example.com",
      "deal_score": 72,
      "vercel_fit": "strong",
      "traffic_tier": "mid-market",
      "industry": "e-commerce",
      "recommended_action": "schedule-discovery-call"
    }
  },
  "tech_stack": {
    "kind": "stack-detection",
    "title": "example.com: Next.js on AWS",
    "body": "{\"frontend_framework\":{\"name\":\"Next.js\",\"is_nextjs\":true,...},\"hosting\":{\"name\":\"AWS\",...},...}",
    "importance": 0.8,
    "tags": ["entity-example-com", "tech-stack", "partially-decoupled"],
    "metadata": { /* ... */ }
  },
  "performance": { /* CortexNode with kind "performance-snapshot" */ },
  "qualification": { /* CortexNode with kind "qualification-score" */ },
  "value_proposition": { /* CortexNode with kind "value-proposition" */ },
  "architecture": { /* CortexNode with kind "poc-scope" */ },
  "case_study_match": { /* CortexNode with kind "case-study-match" */ },
  "migration_steps": [
    {
      "kind": "migration-pattern",
      "title": "example.com Step 1: Repository setup",
      "body": "Clone the repository and configure Vercel project...",
      "importance": 0.5,
      "tags": ["entity-example-com", "migration", "direct-deploy"],
      "metadata": {
        "step_number": 1,
        "effort": "1 day",
        "risk_level": "low",
        "migration_approach": "direct-deploy",
        "source_framework": "Next.js",
        "source_hosting": "AWS"
      }
    }
    /* ... more migration step nodes */
  ]
}
```

### Error Responses

If no analysis exists for the domain, all fields except `domain` return `null` or `[]`:

```json
{
  "domain": "unknown-domain.com",
  "prospect": null,
  "tech_stack": null,
  "performance": null,
  "qualification": null,
  "value_proposition": null,
  "architecture": null,
  "case_study_match": null,
  "migration_steps": []
}
```

### Notes

- The endpoint searches Cortex by domain text, retrieves up to 30 results, and filters by entity tag (`entity-<domain-with-hyphens>`).
- Dots in the domain are replaced with hyphens for the entity tag (e.g., `example.com` becomes `entity-example-com`).

---

## GET /api/briefing/[domain]

Retrieves a Cortex briefing for the Lighthouse agent. The briefing provides a synthesised summary of all stored intelligence.

### Request

**Path parameter:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `domain` | `string` | The domain to request a briefing for (currently unused; the briefing is fetched for the `"lighthouse"` agent) |

### Response

**Content-Type:** `application/json`

On success, returns the briefing object from Cortex. The structure depends on the Cortex briefing configuration.

On failure:

```json
{ "error": "Briefing unavailable" }
```

### Example

```bash
curl http://localhost:3000/api/briefing/example.com
```

### Error Responses

| Condition | Response |
|-----------|----------|
| Cortex unreachable or briefing not configured | `{ "error": "Briefing unavailable" }` |

### Notes

- The domain path parameter is accepted but not currently used to filter the briefing. The endpoint always requests the briefing for the `"lighthouse"` agent with `compact = true`.
- Cortex briefing calls use a 5-second timeout.

---

## Data Models

The following data models are defined as Zod schemas in `lib/schemas.ts` and as a TypeScript interface in `lib/pagespeed.ts`. The Zod schemas are used for structured generation with Gemini (the AI model produces objects that conform to these schemas). The TypeScript types are inferred from Zod via `z.infer<>`.

### TechStack

Comprehensive composable architecture detection for a prospect website. Produced by the `detectTechStack` Gemini call.

```typescript
interface TechStack {
  frontend_framework: {
    name: string                        // Framework name (e.g., "Next.js", "React", "Vue")
    version?: string                    // Detected version string
    confidence: "high" | "medium" | "low"
    evidence: string                    // Signals used to identify the framework
    is_nextjs: boolean                  // True when the framework is Next.js
    nextjs_version?: string             // Major version if Next.js: "12", "13", "14", "15"
    uses_app_router?: boolean           // True when Next.js App Router is detected
    is_self_hosted?: boolean            // True when Next.js is NOT hosted on Vercel
  }

  rendering_analysis: {
    primary_strategy:                   // Dominant rendering strategy observed
      | "SSR"
      | "SSG"
      | "CSR"
      | "ISR"
      | "streaming-SSR"
      | "hybrid"
      | "unknown"
    has_hydration_issues: boolean       // Signs of hydration mismatch detected
    has_stale_while_revalidate: boolean // SWR caching in use
    client_side_data_fetching: boolean  // Client-side fetch that could be server-rendered
    evidence: string                    // Signals supporting rendering analysis
  }

  hosting: {
    name: string                        // Hosting provider name
    confidence: "high" | "medium" | "low"
    evidence: string
    is_vercel: boolean                  // True if currently hosted on Vercel
    estimated_infra_complexity:         // Rough infrastructure complexity
      | "simple"
      | "moderate"
      | "complex"
  }

  cdn: {
    name: string                        // CDN name
    confidence: "high" | "medium" | "low"
    evidence: string
  }

  // Optional service layer detections -- each follows the DetectedTech shape:
  // { name: string, confidence: "high"|"medium"|"low", evidence: string }
  cms?: DetectedTech                    // Content Management System
  commerce?: DetectedTech               // E-commerce platform
  search?: DetectedTech                 // Site-search provider
  media_dam?: DetectedTech              // Media / Digital Asset Management
  ab_testing?: DetectedTech             // A/B testing or feature-flag platform
  personalization?: DetectedTech        // Personalization engine
  auth?: DetectedTech                   // Authentication provider
  payments?: DetectedTech               // Payment processing provider
  monitoring?: DetectedTech             // Monitoring / observability platform

  analytics: Array<{
    name: string                        // Analytics tool name
    evidence: string                    // How it was detected
  }>

  api_patterns?: {
    detected_endpoints: string[]        // API endpoint paths observed
    api_style: string                   // "REST", "GraphQL", "tRPC", or "none detected"
    has_bff_layer: boolean              // Backend-for-Frontend layer present
    has_middleware: boolean             // Edge/server middleware detected
  }

  third_party_scripts: Array<{
    name: string                        // Script or service name
    purpose: string                     // What the script does
    url_pattern: string                 // URL or domain pattern it loads from
    estimated_impact: "high" | "medium" | "low"  // Performance impact estimate
  }>

  composable_maturity:                  // Overall architecture maturity
    | "monolithic"
    | "partially-decoupled"
    | "headless"
    | "fully-composable"

  meta_framework_signals: string[]      // Additional framework indicators
}
```

### PerformanceMetrics

Unified performance data combining PageSpeed Insights (lab) and Chrome UX Report (field) metrics. Defined as a TypeScript interface in `lib/pagespeed.ts`.

```typescript
interface PerformanceMetrics {
  // Lab data (from PageSpeed Insights / Lighthouse)
  lcp_ms: number | null                // Largest Contentful Paint (ms)
  fid_ms: number | null                // Max Potential First Input Delay (ms)
  cls: number | null                   // Cumulative Layout Shift
  fcp_ms: number | null                // First Contentful Paint (ms)
  ttfb_ms: number | null               // Time to First Byte (ms)
  tbt_ms: number | null                // Total Blocking Time (ms)
  inp_ms: number | null                // Interaction to Next Paint (ms)
  speed_index_ms: number | null        // Speed Index (ms)
  performance_score: number | null     // Lighthouse performance score (0-100)

  // Field data (from Chrome UX Report, p75 values)
  crux_lcp_p75: number | null          // CrUX LCP 75th percentile (ms)
  crux_inp_p75: number | null          // CrUX INP 75th percentile (ms)
  crux_cls_p75: number | null          // CrUX CLS 75th percentile
  crux_ttfb_p75: number | null         // CrUX TTFB 75th percentile (ms)
  has_crux_data: boolean               // Whether any CrUX data was found
  crux_origin_data: boolean            // True if CrUX data is origin-level (not URL-level)

  // Other
  screenshot_base64: string | null     // Base64-encoded page screenshot from Lighthouse
  cwv_assessment:                      // Overall Core Web Vitals assessment
    | "good"
    | "needs-improvement"
    | "poor"
    | "unknown"
}
```

### Qualification

Sales qualification assessment for a prospect. Produced by the `qualifyProspect` Gemini call.

```typescript
interface Qualification {
  deal_score: number                   // Overall deal quality score 0-100

  traffic_tier:                        // Estimated traffic tier from CrUX data
    | "enterprise"                     //   URL-level CrUX data available
    | "mid-market"                     //   Origin-level CrUX data only
    | "smb"                            //   No CrUX data
    | "unknown"

  migration_signals: {
    hiring_frontend: boolean           // Company appears to be hiring frontend engineers
    hiring_signals: string[]           // Job titles or roles found
    mentions_headless: boolean         // Headless/composable/jamstack terms found
    recent_replatform: boolean         // Evidence of recent or in-progress migration
    evidence: string                   // Summary of evidence
  }

  vercel_fit: {
    score: "strong" | "moderate" | "weak"
    rationale: string                  // Explanation of the fit score
    already_on_vercel: boolean         // True if already deployed on Vercel
    blockers: string[]                 // Factors preventing Vercel adoption
    accelerators: string[]             // Factors accelerating Vercel adoption
  }

  company_profile: {
    estimated_size:                    // Estimated company size tier
      | "startup"
      | "scaleup"
      | "mid-market"
      | "enterprise"
      | "unknown"
    industry_vertical: string          // Primary industry (e.g., "e-commerce", "fintech")
    b2b_or_b2c:                        // Business model orientation
      | "B2B"
      | "B2C"
      | "both"
      | "unknown"
  }

  recommended_action:                  // Recommended next step for sales
    | "immediate-outreach"
    | "schedule-discovery-call"
    | "add-to-nurture"
    | "deprioritise"
    | "already-on-vercel"

  action_rationale: string             // Why this action was recommended
}
```

### ValueEngineering

Value engineering analysis quantifying the business case for Vercel migration. Produced by the `engineerValue` Gemini call.

```typescript
interface ValueEngineering {
  revenue_impact: {
    performance_improvement_potential: {
      current_lcp_ms: number           // Current LCP in milliseconds
      projected_lcp_ms: number         // Projected LCP after migration
      lcp_improvement_pct: number      // LCP improvement percentage
      current_ttfb_ms: number          // Current TTFB in milliseconds
      projected_ttfb_ms: number        // Projected TTFB after migration
      ttfb_improvement_pct: number     // TTFB improvement percentage
    }
    conversion_rate_impact: {
      methodology: string              // How the conversion lift was estimated
      estimated_conversion_lift_pct: number
      rationale: string                // Narrative explaining the impact
    }
    qualitative_revenue_drivers: string[]  // Non-quantifiable revenue benefits
  }

  tco_comparison: {
    current_stack_estimate: {
      hosting_monthly: string          // Estimated monthly hosting cost
      cdn_monthly: string              // Estimated monthly CDN cost
      ci_cd_monthly: string            // Estimated monthly CI/CD cost
      monitoring_monthly: string       // Estimated monthly monitoring cost
      developer_infra_time_pct: number // % of developer time on infrastructure
      total_monthly_estimate: string   // Total estimated monthly cost
      assumptions: string              // Key assumptions behind estimates
    }
    vercel_estimate: {
      plan_recommendation: "Pro" | "Enterprise"
      estimated_monthly: string        // Estimated monthly Vercel cost
      includes: string[]               // What is included in the plan
      developer_infra_time_pct: number // Projected infra time after migration
    }
    savings_narrative: string          // Plain-language cost savings summary
  }

  migration: {
    complexity: "trivial" | "low" | "medium" | "high"
    estimated_effort: string           // Effort in person-weeks or sprints
    approach:
      | "direct-deploy"                // Next.js self-hosted -> Vercel
      | "incremental-migration"        // JS framework -> gradual Next.js
      | "frontend-rewrite"             // Partial rewrite needed
      | "full-replatform"              // Non-JS backend, full decoupling
    approach_rationale: string
    migration_steps: Array<{
      step: number                     // Step number in sequence
      title: string
      description: string
      effort: string                   // Estimated effort for this step
      risk_level: "low" | "medium" | "high"
    }>
    risks: Array<{
      risk: string                     // Description of the risk
      mitigation: string               // How to mitigate
      severity: "low" | "medium" | "high"
    }>
  }

  vercel_features: Array<{
    feature: string                    // Feature name (e.g., "Edge Functions")
    relevance_to_prospect: string      // Why this matters for this prospect
    priority: "critical" | "high" | "medium" | "low"
    category:
      | "performance"
      | "developer-experience"
      | "security"
      | "observability"
      | "ai"
      | "commerce"
  }>

  competitor_displacement: {
    current_provider: string           // Current hosting/platform provider
    provider_category:
      | "cloud-hosting"
      | "edge-platform"
      | "monolithic-cms"
      | "self-hosted"
    switching_cost: "trivial" | "low" | "medium" | "high"
    key_differentiators: string[]      // Vercel advantages over current provider
    common_objections: Array<{
      objection: string                // Common objection prospects raise
      response: string                 // Recommended response
    }>
  }

  talking_points: Array<{
    point: string                      // The talking point
    audience:                          // Target audience
      | "engineering"
      | "engineering-leadership"
      | "executive"
      | "finance"
    supporting_data: string            // Data or evidence backing the point
  }>

  closest_case_study: {
    company: string                    // Company name from Vercel case studies
    similarity_rationale: string       // Why this case study is relevant
    key_outcomes: string[]             // Headline outcomes
    reference_url?: string             // URL to the case study
  }
}
```

### Architecture

Architecture analysis with current-state and target-state Mermaid diagrams plus a PoC proposal. Produced by the `designArchitecture` Gemini call.

```typescript
interface Architecture {
  current_architecture: {
    mermaid_diagram: string            // Mermaid "graph TD" diagram source
    description: string                // Plain-language description
    pain_points: string[]              // Key limitations of current architecture
  }

  target_architecture: {
    mermaid_diagram: string            // Mermaid "graph TD" diagram source
    description: string                // Plain-language description
    key_changes: Array<{
      component: string                // Architecture component being changed
      from: string                     // Current state
      to: string                       // Proposed new state
      benefit: string                  // Benefit of the change
    }>
  }

  poc_proposal: {
    title: string                      // PoC project title
    scope: string                      // What the PoC covers and excludes
    approach: string                   // Technical approach
    duration: string                   // Estimated duration (e.g., "2 weeks")
    success_criteria: Array<{
      metric: string                   // Metric to measure
      current_value: string            // Current baseline value
      target_value: string             // Target value for success
    }>
    required_from_prospect: string[]   // What the prospect needs to provide
    vercel_resources: string[]         // Vercel resources to allocate
    risk_mitigation: string            // How risks are managed during the PoC
  }
}
```

### CortexNode

The shape of a node stored in and retrieved from Cortex graph memory. Used across the prospects and briefing endpoints.

```typescript
interface CortexNode {
  kind: string                         // Node type (see Cortex node kinds below)
  title: string                        // Human-readable title
  body: string                         // Node content (often JSON-serialised data)
  importance: number                   // Importance weight (0.0 to 1.0)
  tags?: string[]                      // Tags for filtering and entity association
  metadata?: Record<string, any>       // Structured metadata for quick lookups
  source_agent?: string                // Agent that created this node (default: "lighthouse")
  valid_from?: string                  // ISO 8601 timestamp
}
```

**Cortex node kinds** used by Lighthouse:

| Kind | Importance | Description |
|------|------------|-------------|
| `prospect` | 0.9 | Top-level prospect overview with deal score and recommended action |
| `stack-detection` | 0.8 | Full TechStack JSON in body |
| `performance-snapshot` | 0.7 | Full PerformanceMetrics JSON in body |
| `qualification-score` | 0.85 | Full Qualification JSON in body |
| `value-proposition` | 0.9 | Full ValueEngineering JSON in body |
| `poc-scope` | 0.85 | Full Architecture JSON in body |
| `case-study-match` | 0.6 | Matched Vercel case study with rationale |
| `migration-pattern` | 0.5 | One node per migration step (multiple per prospect) |
