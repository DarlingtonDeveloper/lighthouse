# Lighthouse Architecture

This document describes the architecture of Lighthouse, a deal qualification tool for Vercel enterprise sales. It covers the system design, data flow, AI integration, external service dependencies, and frontend rendering patterns.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Pipeline Architecture](#2-pipeline-architecture)
3. [Data Flow](#3-data-flow)
4. [AI Integration](#4-ai-integration)
5. [Cortex Integration](#5-cortex-integration)
6. [Performance and Resilience](#6-performance-and-resilience)
7. [Frontend Architecture](#7-frontend-architecture)

---

## 1. System Overview

Lighthouse is a Next.js application that analyses prospect websites to produce structured sales intelligence. A user submits a URL, and the system fetches the page, detects its technology stack, measures performance, qualifies the prospect, engineers a value proposition, and designs a migration architecture -- all streamed back to the user in real time.

```
                                +------------------+
                                |                  |
                                |   Gemini 2.5     |
                                |   Flash          |
                                |   (AI Analysis)  |
                                |                  |
                                +--------+---------+
                                         |
                                         | generateObject()
                                         | x4 calls
                                         |
+----------+    POST /api/discover   +---+---------------+    fetch()     +----------------+
|          | ----------------------> |                    | ------------> | Prospect       |
|  User    |    SSE stream           |   Next.js App      |               | Website        |
|  Browser | <---------------------- |   (App Router)    |               | (target URL)   |
|          |                         |                    |               +----------------+
+----+-----+                         +---+----+-----+----+
     |                                   |    |     |
     | GET /api/prospects/*              |    |     |
     | GET /api/briefing/*               |    |     |
     |                                   |    |     |
     +-----------------------------------+    |     |
                                              |     |
                              PSI + CrUX API  |     | Cortex API
                                              |     | (background via waitUntil)
                                              |     |
                                    +---------+--+  +----------+
                                    |            |  |          |
                                    | Google     |  | Cortex   |
                                    | PageSpeed  |  | Graph    |
                                    | Insights   |  | Memory   |
                                    | + CrUX     |  |          |
                                    +------------+  +----------+
```

### External Services

| Service | Purpose | Required? |
|---------|---------|-----------|
| **Gemini 2.5 Flash** (via `@ai-sdk/google`) | Structured AI analysis: tech stack detection, prospect qualification, value engineering, architecture design | Yes |
| **PageSpeed Insights API** | Lighthouse lab metrics (LCP, TTFB, CLS, FCP, TBT, Speed Index, performance score, screenshot) | Yes (graceful degradation if unavailable) |
| **Chrome UX Report (CrUX) API** | Real-user field metrics (p75 values for LCP, INP, CLS, TTFB) | No (enhances analysis when available) |
| **Cortex** | Graph memory for persistent storage, semantic search, cross-prospect learning, and briefings | No (pipeline runs without it; storage silently fails) |

---

## 2. Pipeline Architecture

The analysis pipeline runs inside the `POST /api/discover` route handler. It executes six user-facing stages, streams results via SSE, and defers storage to a background task.

### Stage Execution Order

```
Stage 1: fetchPage(url)
    |
    +-- Stage 2: detectTechStack(html, headers, domain)  --|
    |                                                      |--> Promise.all (parallel)
    +-- Stage 3: getPerformanceMetrics(url)             --|
    |
Stage 4: qualifyProspect(domain, techStack, performance)
    |
    +-- cortexSearchPriorPatterns(techStack)   (sub-step within Stage 5)
    |
Stage 5: engineerValue(domain, techStack, performance, qualification, priorPatterns)
    |
Stage 6: designArchitecture(domain, techStack, performance, valueEngineering)
    |
[Stream close]
    |
Background: storeInCortex(domain, url, allResults)   (via waitUntil)
```

### Stages 2 and 3: Parallel Execution

Tech stack detection and performance measurement are independent of each other. Both depend only on Stage 1 output (HTML and headers for tech stack; URL for performance). They run concurrently via `Promise.all`:

```typescript
const [techStack, performance] = await Promise.all([
  detectTechStack(html, headers, domain),
  getPerformanceMetrics(url),
])
```

All subsequent stages run sequentially because each depends on the output of the prior stage.

### SSE Streaming Implementation

The route handler constructs a `ReadableStream` with a `TextEncoder` to push SSE events to the client:

```typescript
const encoder = new TextEncoder()
const stream = new ReadableStream({
  start(controller) {
    const send = (stage: string, data: Record<string, unknown>) => {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ stage, data })}\n\n`)
      )
    }
    // ... pipeline execution calls send() at each stage ...
  },
})
```

Each event is a single `data:` line followed by a double newline, conforming to the SSE specification. The stream is returned as a `Response` with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive` headers.

### Background Storage via waitUntil

After the pipeline completes and the `complete` event is emitted, the stream closes. The `storeInCortex` function is called but its promise is deferred using Vercel's `waitUntil` from `@vercel/functions`:

```typescript
if (storagePromise) {
  waitUntil(storagePromise)
}
```

This keeps the Vercel function instance alive via Fluid Compute to complete the Cortex writes without blocking the user-facing response. The user sees results immediately; storage happens in the background.

---

## 3. Data Flow

### From URL Input to Dashboard

```
1. User enters URL in browser
       |
2. UrlInput component POSTs to /api/discover
       |
3. Server pipeline runs (6 stages, streamed)
       |
4. Client reads SSE stream, updates UI progress
       |
5. On "complete" event, client redirects to /prospects/[domain]
       |
6. Server component fetches from Cortex (cortexSearch)
       |
7. JSON bodies are parsed back into typed objects (safeParse)
       |
8. DashboardContent (client component) renders panels
```

### Pipeline Function Chain

Each function's inputs and outputs:

| Function | Input | Output | Source |
|----------|-------|--------|--------|
| `fetchPage(url)` | URL string | `{ html: string, headers: Record<string, string> }` | `lib/fetcher.ts` |
| `detectTechStack(html, headers, domain)` | Raw HTML, response headers, domain | `TechStack` | `lib/gemini/detect-tech-stack.ts` |
| `getPerformanceMetrics(url)` | URL string | `PerformanceMetrics` | `lib/pagespeed.ts` |
| `qualifyProspect(domain, techStack, performance)` | Domain, TechStack, PerformanceMetrics | `Qualification` | `lib/gemini/qualify-prospect.ts` |
| `cortexSearchPriorPatterns(techStack)` | TechStack (partial: framework, hosting, CMS, commerce names) | `string` (formatted prior patterns) | `lib/cortex.ts` |
| `engineerValue(domain, techStack, performance, qualification, priorPatterns)` | Domain, TechStack, PerformanceMetrics, Qualification, prior patterns string | `ValueEngineering` | `lib/gemini/engineer-value.ts` |
| `designArchitecture(domain, techStack, performance, valueEngineering)` | Domain, TechStack, PerformanceMetrics, ValueEngineering | `Architecture` | `lib/gemini/design-architecture.ts` |

### Cortex Storage

After the pipeline completes, `storeInCortex` writes 8+ nodes to Cortex graph memory:

| Node Kind | Content | Importance |
|-----------|---------|------------|
| `prospect` | Summary text with deal score, fit, and action | 0.9 |
| `stack-detection` | Full TechStack JSON | 0.8 |
| `performance-snapshot` | Full PerformanceMetrics JSON | 0.7 |
| `qualification-score` | Full Qualification JSON | 0.85 |
| `value-proposition` | Full ValueEngineering JSON | 0.9 |
| `poc-scope` | Full Architecture JSON | 0.85 |
| `case-study-match` | Case study rationale text | 0.6 |
| `migration-pattern` (N nodes) | One per migration step, with step description | 0.5 |

All nodes are tagged with `entity-<domain>` (dots replaced with hyphens) for cross-query filtering.

### Dashboard Data Retrieval

The prospect dashboard page (`app/prospects/[domain]/page.tsx`) is a server component that:

1. Calls `cortexSearch(domain, 30)` to retrieve up to 30 nodes.
2. Filters results by entity tag to isolate nodes belonging to the requested domain.
3. Groups nodes by `kind` into a map.
4. Uses `safeParse<T>(body)` to deserialise JSON body strings back into typed objects (`TechStack`, `Qualification`, `ValueEngineering`, `Architecture`, `PerformanceMetrics`).
5. Passes the typed objects to the `DashboardContent` client component for rendering.

---

## 4. AI Integration

### How Gemini Is Used

Lighthouse uses Google's Gemini 2.5 Flash model (`gemini-2.5-flash-preview-05-20`) through the Vercel AI SDK (`ai` package with `@ai-sdk/google` provider). All four AI calls use the `generateObject` function, which produces a typed object conforming to a Zod schema:

```typescript
const { object } = await generateObject({
  model: google("gemini-2.5-flash-preview-05-20"),
  schema: SomeZodSchema,
  prompt: "...",       // user prompt
  system: "...",       // system prompt (used by engineerValue)
})
```

The Zod schema serves double duty: it defines the TypeScript type and constrains the AI output to valid, parseable structured data. The AI SDK handles JSON schema conversion and output validation automatically.

### The Four Gemini Calls

| Call | Schema | System Prompt | User Prompt | Produces |
|------|--------|---------------|-------------|----------|
| `detectTechStack` | `TechStackSchema` | None (single prompt) | HTML source (first 60,000 chars), HTTP headers, domain name. Includes detection priorities: framework, hosting, rendering, composable ecosystem, third-party scripts, maturity assessment. | `TechStack` |
| `qualifyProspect` | `QualificationSchema` | None (single prompt) | Tech stack JSON, performance metrics JSON, careers page HTML (scraped from multiple paths). Includes qualification criteria: traffic tier, Vercel fit, migration intent, deal size signals. | `Qualification` |
| `engineerValue` | `ValueEngineeringSchema` | Detailed system prompt with revenue impact model (Google/Deloitte research, Forrester TEI), TCO comparison reference ranges, migration approach decision tree, competitive displacement narratives, case study database, talking point framework, and prior Cortex patterns. | Tech stack JSON, performance metrics JSON, qualification JSON, domain name. | `ValueEngineering` |
| `designArchitecture` | `ArchitectureSchema` | None (single prompt) | Tech stack JSON, performance metrics JSON, value engineering JSON, domain name. Includes diagram requirements, page selection rules for PoC, reverse proxy approach, and success criteria framework. | `Architecture` |

### Prompt Structure

- **detectTechStack** and **qualifyProspect** use a single combined prompt with the role context, detection/qualification criteria, input data, and instructions all in one `prompt` field.
- **engineerValue** separates concerns: the `system` prompt contains the SA persona, research citations, cost ranges, competitive narratives, and case study database. The `prompt` field contains only the prospect-specific data.
- **designArchitecture** uses a single `prompt` with three explicit tasks (current diagram, target diagram, PoC proposal) and structured requirements for each.

### Careers Page Scraping

The `qualifyProspect` function includes a sub-step that attempts to scrape the prospect's careers page for hiring signals. It tries four URL patterns in order:

1. `https://<domain>/careers`
2. `https://<domain>/jobs`
3. `https://careers.<domain>`
4. `https://<domain>/about/careers`

Each attempt has a 5-second timeout. The first successful response (up to 20,000 characters) is included in the qualification prompt. If all attempts fail, an empty string is passed instead.

### Error Handling: Degraded Results

Every Gemini function wraps the `generateObject` call in a try/catch and returns a **degraded result** on failure. This ensures the pipeline never crashes due to an AI error. Degraded results contain:

- Default/zero values for numeric fields
- `"detection-failed"` or `"unknown"` for string fields
- Error messages in evidence/rationale fields for debugging
- Empty arrays for list fields

The pipeline continues processing subsequent stages even when a prior stage returns degraded data, though the quality of downstream analysis is naturally reduced.

---

## 5. Cortex Integration

Cortex is a graph memory service that provides persistent storage, semantic search, and briefing capabilities. Lighthouse uses it for three purposes: storing analysis results, retrieving prior patterns for cross-prospect learning, and generating briefings.

### Client Functions

All Cortex interactions are implemented in `lib/cortex.ts`:

| Function | HTTP Method | Endpoint | Timeout | Purpose |
|----------|-------------|----------|---------|---------|
| `cortexStore(node)` | POST | `/nodes` | 5s | Store a single node |
| `cortexSearch(query, limit)` | POST | `/search` | 5s | Semantic search by query string |
| `cortexBriefing(agentId, compact)` | GET | `/briefing/:agentId` | 5s | Retrieve a synthesised briefing |
| `cortexNodes(kind, limit)` | GET | `/nodes` | 5s | List nodes, optionally filtered by kind |

### Entity Tagging

Every node stored for a prospect is tagged with a stable entity tag derived from the domain:

```
example.com  ->  entity-example-com
sub.domain.co.uk  ->  entity-sub-domain-co-uk
```

This tag enables precise retrieval: the prospect detail endpoint searches by domain text, then filters results to only include nodes whose `tags` array contains the entity tag. This prevents cross-domain contamination in search results.

### Prior Pattern Search

Before the value engineering stage, the pipeline queries Cortex for prior migration patterns that match the current prospect's tech stack:

```typescript
const priorPatterns = await cortexSearchPriorPatterns(techStack)
```

This function:

1. Extracts key technology names from the tech stack (framework, hosting, CMS, commerce).
2. Runs a semantic search for each: `"migration <tech_name> value-proposition"`.
3. Deduplicates results by title.
4. Returns the top 5 results formatted as `[kind] title: body_preview`.

These patterns are injected into the value engineering prompt, enabling cross-prospect learning. As more prospects are analysed, the system's recommendations improve because the AI has access to patterns from similar migrations.

### Auto-Linker Configuration

Cortex nodes include an `entities` array in their metadata (for `stack-detection`, `performance-snapshot`, `qualification-score`, `value-proposition`, `poc-scope`, and `migration-pattern` kinds). This enables Cortex's auto-linker to establish relationships between nodes that share entities, building a connected graph of prospect intelligence.

### Briefing

The briefing endpoint (`/api/briefing/[domain]`) calls `cortexBriefing("lighthouse", true)` to retrieve a compact briefing for the Lighthouse agent. Briefings are synthesised by Cortex based on all stored nodes associated with the agent, providing a high-level summary of all analysed prospects.

---

## 6. Performance and Resilience

### Timeout Configuration

| Operation | Timeout | Mechanism |
|-----------|---------|-----------|
| Page fetch (`fetchPage`) | 10 seconds | `AbortSignal.timeout(10_000)` |
| PageSpeed Insights API | 45 seconds | `AbortSignal.timeout(45_000)` |
| Chrome UX Report API | 15 seconds | `AbortSignal.timeout(15_000)` |
| Careers page scrape (per URL) | 5 seconds | `AbortSignal.timeout(5_000)` |
| All Cortex operations | 5 seconds | `AbortSignal.timeout(5000)` |
| Overall route handler | 60 seconds | `maxDuration = 60` (Vercel function config) |

### Failure Handling Strategy

The pipeline is designed to never crash. Every external call is wrapped in error handling that returns a safe default:

| Component | Failure Behaviour |
|-----------|-------------------|
| `fetchPage` | Returns `{ html: "", headers: {} }` -- subsequent Gemini analysis runs on empty input and produces low-confidence results |
| `fetchPSI` | Returns `null` -- performance metrics default to `null` values |
| `fetchCrUX` | Returns `null` -- CrUX fields default to `null`, `has_crux_data` stays `false` |
| `getPerformanceMetrics` | Wraps PSI + CrUX in `Promise.allSettled` -- either can fail independently without affecting the other |
| `detectTechStack` | Returns degraded `TechStack` with `"detection-failed"` names and `"low"` confidence |
| `qualifyProspect` | Returns `Qualification` with `deal_score: 0`, `recommended_action: "deprioritise"` |
| `engineerValue` | Returns degraded `ValueEngineering` with zero improvements and "Unknown" costs |
| `designArchitecture` | Returns minimal Mermaid diagrams built from whatever tech stack data is available |
| `cortexStore` | Logs error, returns `null` -- does not throw |
| `cortexSearch` | Returns `{ results: [] }` |
| `cortexSearchPriorPatterns` | Returns `""` (empty string) |
| `storeInCortex` | Uses `Promise.allSettled` for all node writes -- individual failures are logged but never throw. Reports failure count. |

### Promise.allSettled for Parallel Operations

Two critical operations use `Promise.allSettled` instead of `Promise.all` to ensure partial failures do not cascade:

1. **Performance metrics** (`getPerformanceMetrics`): PSI and CrUX calls run in parallel. If PSI fails, CrUX data is still used (and vice versa).
2. **Cortex storage** (`storeInCortex`): All 8+ node writes run in parallel. If some writes fail, the others still succeed. Failure count is logged.

### Degraded Results Pattern

Every Gemini-powered function follows the same pattern:

```
try {
  result = await generateObject(...)
  return result.object
} catch (error) {
  log error
  return DEGRADED_FALLBACK
}
```

The degraded fallback is a valid instance of the expected return type, with safe default values and error context embedded in descriptive fields. This means downstream stages always receive a well-typed input, even if the data quality is poor.

---

## 7. Frontend Architecture

### Server vs. Client Components

Lighthouse uses Next.js App Router with a clear separation between server and client components:

| Component | Type | Responsibility |
|-----------|------|----------------|
| `app/page.tsx` | Client (`'use client'`) | Home page with URL input form and prospect list |
| `app/prospects/[domain]/page.tsx` | Server (default) | Fetches Cortex data, parses JSON bodies, passes typed props to dashboard |
| `app/prospects/[domain]/dashboard-content.tsx` | Client (`'use client'`) | Renders all dashboard panels with interactive features |
| `components/url-input.tsx` | Client (`'use client'`) | SSE consumer, form state, pipeline progress display |
| `components/architecture-panel.tsx` | Client (`'use client'`) | Mermaid diagram rendering |

The prospect detail page (`app/prospects/[domain]/page.tsx`) is a server component that performs data fetching at request time. It calls Cortex, parses the stored JSON bodies into typed objects, and passes them as props to the `DashboardContent` client component. This keeps data fetching on the server and rendering logic on the client.

### SSE Consumer Pattern

The `UrlInput` component (`components/url-input.tsx`) consumes the SSE stream from `/api/discover` using the Fetch API's `ReadableStream` reader:

```typescript
const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''       // Keep incomplete line in buffer

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const { stage, data } = JSON.parse(line.slice(6))
    // Update React state based on stage...
  }
}
```

Key implementation details:

- **Buffering**: Incoming chunks may split across SSE event boundaries. The component accumulates data in a buffer and splits on newlines, keeping the last (potentially incomplete) line for the next read cycle.
- **Line filtering**: Only lines starting with `data: ` are processed. Empty lines and malformed data are silently skipped.
- **State updates**: Each stage event updates a `stages` state object keyed by stage name. The `complete` event triggers `onAnalysisComplete`, which navigates to the prospect dashboard.
- **Error handling**: Stream read errors and JSON parse errors are caught. The `error` stage event sets an error message in component state.

### Dashboard Data Parsing

The server component `app/prospects/[domain]/page.tsx` retrieves Cortex nodes whose `body` fields contain JSON-serialised data. A `safeParse` utility handles deserialisation:

```typescript
function safeParse<T>(body: string | undefined | null): T | null {
  if (!body) return null
  try {
    return JSON.parse(body) as T
  } catch {
    return null
  }
}
```

Each node kind maps to a typed object:

| Node Kind | Parsed Type | Dashboard Panel |
|-----------|-------------|-----------------|
| `qualification-score` | `Qualification` | `QualificationPanel` |
| `stack-detection` | `TechStack` | `TechStackPanel` |
| `performance-snapshot` | `PerformanceMetrics` | `PerformancePanel` |
| `value-proposition` | `ValueEngineering` | `ValueEngineeringPanel` |
| `poc-scope` | `Architecture` | `ArchitecturePanel` |

### Mermaid Diagram Rendering

The `ArchitecturePanel` component renders Mermaid diagrams (current and target architecture) using dynamic import and client-side rendering:

1. **Dynamic import**: Mermaid is loaded at runtime via `await import("mermaid")` to avoid SSR issues and reduce the initial bundle size.

2. **Initialisation**: Mermaid is configured with a dark theme and custom colour variables to match the application's design:
   ```typescript
   mermaid.initialize({
     startOnLoad: false,
     theme: "dark",
     themeVariables: {
       primaryColor: "#1e293b",
       primaryTextColor: "#e2e8f0",
       primaryBorderColor: "#475569",
       lineColor: "#64748b",
       secondaryColor: "#0f172a",
       tertiaryColor: "#1e293b",
     },
     flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
   })
   ```

3. **Rendering**: Each diagram is rendered with `mermaid.render(id, chart)`, which produces an SVG string that is injected into a container div via `innerHTML`.

4. **Fallback**: If Mermaid rendering fails (invalid syntax, library load error), the component falls back to displaying the raw Mermaid source code in a `<pre><code>` block. This ensures the user always sees the diagram content, even if it cannot be rendered graphically.

5. **Deduplication guard**: A `renderedRef` boolean prevents double-rendering in React Strict Mode or on rapid re-renders.

### Dashboard Layout

The `DashboardContent` component arranges panels in a responsive grid:

```
+----------------------------------+----------------------------------+
|  QualificationPanel              |  TechStackPanel                  |
|  (deal score, fit, signals)      |  (framework, hosting, services)  |
+----------------------------------+----------------------------------+
|  PerformancePanel                |  ValueEngineeringPanel           |
|  (CWV metrics, scores)          |  (TCO, revenue impact, migration)|
+----------------------------------+----------------------------------+
|  ArchitecturePanel (full width)                                     |
|  (current + target Mermaid diagrams, PoC proposal)                  |
+---------------------------------------------------------------------+
|  TalkingPointsPanel (full width)                                    |
|  (audience-segmented talking points, competitive displacement)      |
+---------------------------------------------------------------------+
```

Panels gracefully handle `null` data: if a particular analysis section is unavailable (due to Cortex retrieval failure or degraded pipeline results), the corresponding panel is simply not rendered.
