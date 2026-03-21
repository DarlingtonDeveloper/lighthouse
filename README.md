# Lighthouse

> AI-powered deal qualification and value engineering agent for Vercel enterprise sales.

[![CI](https://github.com/michaeldarlington/lighthouse/actions/workflows/ci.yml/badge.svg)](https://github.com/michaeldarlington/lighthouse/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-127_passing-brightgreen)](#testing)
[![Coverage](https://img.shields.io/badge/coverage-~94%25-brightgreen)](#testing)

---

## What It Does

Enter a URL. In roughly 60 seconds, Lighthouse runs a full pre-sales engineering workflow and delivers an enterprise-ready prospect briefing.

The pipeline executes six stages via a real-time SSE stream:

| Stage | What Happens |
|-------|-------------|
| **1. Fetch** | Retrieves the page, captures response headers, and extracts raw HTML for analysis. |
| **2. Tech Stack Detection** | Identifies the full composable architecture -- framework, hosting, CDN, CMS, commerce, search, auth, payments, monitoring, analytics, third-party scripts, and rendering strategy. Runs in parallel with performance. |
| **3. Performance Measurement** | Queries PageSpeed Insights and Chrome UX Report for lab and real-user metrics (LCP, TTFB, CLS, FID, INP). Runs in parallel with tech stack. |
| **4. Prospect Qualification** | Scores the deal 0--100, classifies traffic tier, assesses Vercel fit, and scrapes the careers page for migration signals (frontend hiring, headless mentions, replatform activity). |
| **5. Value Engineering** | Models revenue impact with published research citations, builds a TCO comparison, generates a migration plan with risk assessment, maps competitive displacement, matches the closest Vercel case study, and produces audience-segmented talking points. |
| **6. Architecture Design** | Generates current-state and target-state Mermaid diagrams, proposes a PoC with measurable success criteria and resource requirements. |

All results are stored in Cortex graph memory for cross-prospect pattern learning, so each new analysis benefits from prior discoveries.

---

## Dashboard

The prospect dashboard renders analysis results across six panels with a deal score header:

```
+---------------------------------------------------------------+
|  <- Back to all prospects                                     |
|  example.com                    [Deal Score: 82] [Immediate]  |
+---------------------------------------------------------------+
|                          |                                    |
|  QUALIFICATION           |  TECH STACK                        |
|  Deal Score: 82/100      |  Framework: Next.js 14 (App Router)|
|  Traffic: Enterprise     |  Hosting: AWS CloudFront           |
|  Vercel Fit: Strong      |  CMS: Contentful                   |
|  Action: Immediate       |  Commerce: Shopify                 |
|  Hiring: 3 frontend roles|  CDN: CloudFront                   |
|  Headless mentions: Yes  |  Maturity: partially-decoupled     |
|                          |                                    |
+---------------------------------------------------------------+
|                          |                                    |
|  PERFORMANCE             |  VALUE ENGINEERING                 |
|  LCP: 3.2s -> 1.8s      |  Revenue Impact                    |
|  TTFB: 890ms -> 120ms   |    Conv. lift: +12%                |
|  CLS: 0.12              |  TCO Comparison                    |
|  FID: 45ms              |    Current: $8,200/mo              |
|  Overall: Needs Work     |    Vercel: $5,000/mo               |
|                          |  Migration: 6-8 weeks              |
|                          |                                    |
+---------------------------------------------------------------+
|                                                               |
|  ARCHITECTURE                                                 |
|  Current State Diagram    |    Target State Diagram            |
|  [Mermaid graph TD]       |    [Mermaid graph TD]              |
|                                                               |
|  PoC Proposal: "Migrate product pages to Next.js on Vercel"   |
|  Duration: 2 weeks  |  Success: LCP < 2s, TTFB < 200ms       |
|                                                               |
+---------------------------------------------------------------+
|                                                               |
|  TALKING POINTS                                               |
|  Engineering | Eng. Leadership | Executive | Finance          |
|  [Audience-segmented talking points with supporting data]     |
|                                                               |
+---------------------------------------------------------------+
```

---

## Quick Start

### Prerequisites

- **Node.js** 20+
- **npm** 9+
- A **Google Gemini API key** ([get one here](https://aistudio.google.com/apikey))

### Setup

```bash
# Clone the repository
git clone https://github.com/michaeldarlington/lighthouse.git
cd lighthouse

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key-here
```

### Run

```bash
# Start the development server (Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a URL, and watch the pipeline run.

---

## Architecture Overview

### SSE Streaming Pipeline

The core analysis runs through a single `POST /api/discover` endpoint that streams Server-Sent Events back to the client in real time. Each stage emits `running` and `complete` events so the UI can render live progress.

```
Client                          Server (POST /api/discover)
  |                                |
  |---- POST {url} --------------->|
  |                                |-- Stage 1: Fetch page
  |<--- SSE: fetch/running --------|
  |<--- SSE: fetch/complete -------|
  |                                |-- Stage 2+3: Parallel
  |<--- SSE: techstack/running ----|    |-- detectTechStack(html, headers)
  |<--- SSE: performance/running --|    |-- getPerformanceMetrics(url)
  |<--- SSE: techstack/complete ---|
  |<--- SSE: performance/complete -|
  |                                |-- Stage 4: qualifyProspect()
  |<--- SSE: qualification/complete|
  |                                |-- Stage 5: engineerValue()
  |<--- SSE: value/complete -------|
  |                                |-- Stage 6: designArchitecture()
  |<--- SSE: architecture/complete-|
  |<--- SSE: complete -------------|
  |                                |
  |                                |-- (waitUntil) storeInCortex()
```

### Fluid Compute and Background Storage

Lighthouse uses Vercel's Fluid Compute (`waitUntil` from `@vercel/functions`) to store analysis results in Cortex after the SSE stream closes. The user sees results immediately -- the function instance stays alive in the background to complete the graph storage without adding latency to the response.

### Crash-Safe Analysis

Every analysis function (tech stack detection, qualification, value engineering, architecture design) is crash-safe. If an individual stage fails, it returns degraded results rather than crashing the pipeline. The other stages continue running with whatever data is available.

---

## API Reference

### POST /api/discover

Runs the full analysis pipeline for a given URL. Returns a Server-Sent Event stream.

**Request:**

```json
{
  "url": "https://example.com"
}
```

**Response:** SSE stream. Each event follows this structure:

```
data: {"stage": "<stage-name>", "data": {"status": "running"}}
data: {"stage": "<stage-name>", "data": {"status": "complete", "data": {...}}}
```

Stage names: `fetch`, `techstack`, `performance`, `qualification`, `value`, `architecture`, `complete`, `error`.

The final `complete` event contains the full analysis payload with all six stage results, the domain, URL, and timestamp.

**Error responses:**

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{"error": "Invalid or non-public URL..."}` | URL fails validation |

**Configuration:** `maxDuration = 60` (seconds). The pipeline is optimized to complete within this window.

---

### GET /api/prospects

Returns all previously analyzed prospects from Cortex graph memory.

**Response:**

```json
{
  "nodes": [
    {
      "title": "example.com",
      "body": "...",
      "metadata": {
        "deal_score": 82,
        "traffic_tier": "enterprise",
        "recommended_action": "immediate-outreach"
      }
    }
  ]
}
```

---

### GET /api/prospects/[domain]

Returns the full analysis breakdown for a single prospect, grouped by analysis type.

**Response:**

```json
{
  "domain": "example.com",
  "prospect": { ... },
  "tech_stack": { ... },
  "performance": { ... },
  "qualification": { ... },
  "value_proposition": { ... },
  "architecture": { ... },
  "case_study_match": { ... },
  "migration_steps": [ ... ]
}
```

---

### GET /api/briefing/[domain]

Returns the Cortex-generated briefing for cross-prospect pattern insights.

**Response:**

```json
{
  "briefing": "...",
  "patterns": [ ... ]
}
```

Returns `{"error": "Briefing unavailable"}` if Cortex has no data for the domain.

---

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | -- | Google Gemini 2.5 Flash API key. Powers all AI analysis stages. |
| `CORTEX_URL` | No | `http://localhost:9091` | Cortex graph memory endpoint for storing and querying prospect data. |
| `PSI_API_KEY` | No | -- | Google PageSpeed Insights API key. Without it, requests are rate-limited. |
| `CRUX_API_KEY` | No | -- | Chrome UX Report API key for real-user performance data. The same Google API key works for both PSI and CrUX. |

Create a `.env.local` file from the provided template:

```bash
cp .env.example .env.local
```

---

## Testing

Lighthouse has 127 tests covering library code, Gemini analysis functions, and integration flows.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with verbose output and coverage
npx vitest run --reporter=verbose --coverage
```

### Test Structure

| Directory | What It Covers |
|-----------|---------------|
| `lib/__tests__/` | Core library functions -- URL validation, CWV rating, Cortex client, page fetcher, PageSpeed client, Zod schemas, storage pipeline |
| `lib/gemini/__tests__/` | AI analysis functions -- tech stack detection, prospect qualification, value engineering, architecture design |
| `__tests__/integration/` | End-to-end pipeline flow and data flow validation |

### Coverage

Coverage is collected with `@vitest/coverage-v8` and targets `lib/**/*.ts`. Reports are generated in `text`, `lcov`, and `json-summary` formats.

Current coverage: approximately 94% of library code.

---

## Deployment

### Deploy to Vercel

1. Push the repository to GitHub.

2. Import the project in [Vercel](https://vercel.com/new).

3. Set environment variables in the Vercel dashboard:

   | Variable | Value |
   |----------|-------|
   | `GOOGLE_GENERATIVE_AI_API_KEY` | Your Gemini API key |
   | `CORTEX_URL` | Your Cortex instance URL |
   | `PSI_API_KEY` | *(optional)* Google PSI key |
   | `CRUX_API_KEY` | *(optional)* Google CrUX key |

4. Deploy. Vercel auto-detects the Next.js 15 framework.

### Fluid Compute

The `POST /api/discover` route uses `waitUntil` from `@vercel/functions` for background Cortex storage. This requires Vercel's Fluid Compute runtime, which is enabled by default on new deployments. The function's `maxDuration` is set to 60 seconds to accommodate the full pipeline.

### CI/CD

Two GitHub Actions workflows are included:

- **ci.yml** -- Runs on every push and PR to `main`. Executes lint, typecheck, test (with coverage), and build in sequence.
- **release.yml** -- Triggers on `v*` tags. Runs the full CI pipeline, then creates a GitHub Release with an auto-generated changelog.

---

## Project Structure

```
lighthouse/
├── app/
│   ├── layout.tsx                       Root layout (dark theme, Geist font)
│   ├── page.tsx                         Landing page (URL input + recent analyses)
│   ├── globals.css                      Global styles
│   ├── prospects/[domain]/
│   │   ├── page.tsx                     Prospect dashboard (server component)
│   │   ├── dashboard-content.tsx        Dashboard panels (client component)
│   │   ├── loading.tsx                  Skeleton loading state
│   │   └── error.tsx                    Error boundary
│   └── api/
│       ├── discover/route.ts            SSE streaming pipeline endpoint
│       ├── prospects/route.ts           List all analyzed prospects
│       ├── prospects/[domain]/route.ts  Full analysis for one prospect
│       └── briefing/[domain]/route.ts   Cortex briefing
├── components/
│   ├── url-input.tsx                    URL input with SSE consumer
│   ├── pipeline-progress.tsx            Real-time stage progress tracker
│   ├── prospect-card.tsx                Prospect card for grid display
│   ├── deal-score-badge.tsx             Color-coded deal score badge
│   ├── cwv-indicator.tsx                Core Web Vitals indicator
│   ├── qualification-panel.tsx          Deal qualification panel
│   ├── tech-stack-panel.tsx             Tech stack + composable architecture map
│   ├── performance-panel.tsx            Performance metrics panel
│   ├── value-engineering-panel.tsx       Revenue impact + TCO + migration panel
│   ├── architecture-panel.tsx           Mermaid diagrams + PoC proposal
│   ├── talking-points-panel.tsx         Audience-segmented talking points
│   └── ui/                             shadcn/ui primitives
├── lib/
│   ├── utils.ts                         URL validation, CWV rating, formatting
│   ├── cortex.ts                        Cortex HTTP client
│   ├── cortex-store-pipeline.ts         Bulk storage pipeline
│   ├── fetcher.ts                       Resilient page fetcher
│   ├── pagespeed.ts                     PSI + CrUX client
│   ├── schemas.ts                       Zod schemas (TechStack, Qualification,
│   │                                    ValueEngineering, Architecture)
│   └── gemini/
│       ├── index.ts                     Barrel export
│       ├── detect-tech-stack.ts         Composable architecture detection
│       ├── qualify-prospect.ts          Deal qualification + careers scraping
│       ├── engineer-value.ts            Revenue impact + TCO + migration
│       └── design-architecture.ts       Current/target diagrams + PoC
├── __tests__/integration/               Integration tests
├── .github/workflows/
│   ├── ci.yml                           Lint, typecheck, test, build
│   └── release.yml                      CI + GitHub Release on v* tags
├── vitest.config.ts                     Test configuration
├── next.config.ts                       Next.js configuration
├── .env.example                         Environment variable template
└── package.json
```

---

## How Lighthouse Maps to the Solutions Architect Role

| SA Responsibility | How Lighthouse Handles It |
|-------------------|--------------------------|
| **Prospect research** | Automated URL analysis replaces hours of manual research. Tech stack, performance, and company profile are extracted in under 60 seconds. |
| **Technical discovery** | Composable architecture detection identifies the full stack -- framework, hosting, CDN, CMS, commerce, auth, payments, monitoring -- with confidence levels and evidence. |
| **Deal qualification** | Structured scoring (0--100) with traffic tier classification, Vercel fit assessment, migration signal detection, and a recommended next action. |
| **Value proposition** | Revenue impact modeling with published research citations, TCO comparison, and quantified performance improvement projections. |
| **Competitive positioning** | Competitive displacement analysis with key differentiators and pre-built objection handling for the incumbent provider. |
| **Architecture design** | Current-state and target-state Mermaid diagrams with annotated changes and benefits. |
| **PoC scoping** | Structured PoC proposal with scope, duration, success criteria, and resource requirements from both sides. |
| **Stakeholder communication** | Audience-segmented talking points for engineering, engineering leadership, executive, and finance stakeholders. |
| **Case study matching** | Automated matching to the most relevant Vercel case study with similarity rationale and key outcomes. |
| **Knowledge management** | Cortex graph memory stores every analysis for cross-prospect pattern learning and briefing generation. |

---

## Built With

| Technology | Purpose |
|-----------|---------|
| [Next.js 15](https://nextjs.org/) (App Router, TypeScript) | Full-stack React framework with server and client components |
| [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | Styling and UI component system |
| [Vercel AI SDK](https://sdk.vercel.ai/) + [Google Gemini 2.5 Flash](https://ai.google.dev/) | Structured AI output for all analysis stages |
| [Cortex](https://withcortex.com/) | Graph memory for prospect storage and cross-analysis pattern learning |
| [Google PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/get-started) | Lab performance metrics |
| [Chrome UX Report](https://developer.chrome.com/docs/crux/) | Real-user performance data |
| [Vercel Fluid Compute](https://vercel.com/docs/functions/fluid-compute) | `waitUntil` for background storage without blocking the response |
| [Zod](https://zod.dev/) | Schema validation for all AI-generated structured output |
| [Mermaid](https://mermaid.js.org/) | Architecture diagram rendering |
| [Vitest](https://vitest.dev/) | Test framework with V8 coverage |
| [GitHub Actions](https://github.com/features/actions) | CI/CD pipeline |

---

## License

MIT
