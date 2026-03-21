# Contributing to Lighthouse

This guide covers how to set up a development environment, understand the codebase structure, follow project conventions, add new analysis stages, run tests, and submit pull requests.

---

## Table of Contents

1. [Development Setup](#1-development-setup)
2. [Project Structure Overview](#2-project-structure-overview)
3. [Code Conventions](#3-code-conventions)
4. [Adding a New Analysis Stage](#4-adding-a-new-analysis-stage)
5. [Testing](#5-testing)
6. [Commit Convention](#6-commit-convention)
7. [Pull Request Process](#7-pull-request-process)

---

## 1. Development Setup

### Clone and install

```bash
git clone https://github.com/your-org/lighthouse.git
cd lighthouse
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in at least the required variable:

```
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key-here
CORTEX_URL=                  # optional
PSI_API_KEY=                 # optional
CRUX_API_KEY=                # optional
```

You can get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). See [docs/DEPLOYMENT.md](DEPLOYMENT.md) for details on the other variables.

### Start the dev server

```bash
npm run dev
```

The application starts on [http://localhost:3000](http://localhost:3000) using Next.js with Turbopack for fast refresh.

### Available scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start dev server with Turbopack |
| `build` | `npm run build` | Production build |
| `start` | `npm start` | Serve production build |
| `lint` | `npm run lint` | Run ESLint |
| `test` | `npm test` | Run all tests (Vitest) |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |

---

## 2. Project Structure Overview

```
lighthouse/
  app/                         # Next.js App Router
    api/                       #   Route handlers (API endpoints)
      discover/route.ts        #   Main pipeline endpoint (SSE stream)
      prospects/route.ts       #   Prospect listing
      briefing/[domain]/       #   Briefing endpoint
    prospects/[domain]/        #   Prospect dashboard page
    page.tsx                   #   Home page (URL input)
    layout.tsx                 #   Root layout
  components/                  # React components
    ui/                        #   shadcn/ui primitives (button, card, etc.)
    pipeline-progress.tsx      #   Pipeline stage progress indicator
    url-input.tsx              #   URL input form
    tech-stack-panel.tsx       #   Tech stack results panel
    qualification-panel.tsx    #   Qualification results panel
    value-engineering-panel.tsx#   Value engineering results panel
    architecture-panel.tsx     #   Architecture results panel
    performance-panel.tsx      #   Performance metrics panel
    prospect-card.tsx          #   Prospect list card
  lib/                         # Core business logic
    gemini/                    #   AI analysis modules
      detect-tech-stack.ts     #     Tech stack detection
      qualify-prospect.ts      #     Prospect qualification
      engineer-value.ts        #     Value engineering
      design-architecture.ts   #     Architecture design
      index.ts                 #     Barrel export
      __tests__/               #     Gemini module tests
    schemas.ts                 #   Zod schemas (source of truth for all data shapes)
    fetcher.ts                 #   Page fetcher
    pagespeed.ts               #   PageSpeed Insights + CrUX client
    cortex.ts                  #   Cortex API client
    cortex-store-pipeline.ts   #   Cortex storage for pipeline results
    utils.ts                   #   Shared utilities
    __tests__/                 #   Unit tests for lib modules
  __tests__/
    integration/               # Integration tests
  docs/                        # Documentation
```

### Key conventions

- **`lib/`** contains all core logic. Every function here is framework-agnostic and independently testable.
- **`lib/gemini/`** contains one module per AI analysis stage. Each module exports a single async function that calls `generateObject()` with a Zod schema.
- **`lib/schemas.ts`** is the single source of truth for all data shapes. Zod schemas defined here are used for AI output validation, TypeScript types (via `z.infer`), and API response structure.
- **`components/`** contains React components. `components/ui/` holds shadcn/ui primitives; all other files are business-specific components.
- **`app/`** contains Next.js pages and route handlers. Business logic does not live here -- routes call into `lib/`.

---

## 3. Code Conventions

### TypeScript

- **Strict mode is enabled.** The `tsconfig.json` sets `"strict": true`. All code must pass strict type checking.
- **Path aliases.** Use `@/*` to import from the project root. For example: `import { fetchPage } from "@/lib/fetcher"`.

### Error handling

All `lib/` functions are crash-safe. They catch errors internally and return degraded results rather than throwing. This ensures that a failure in one pipeline stage does not prevent subsequent stages from running.

### Zod schemas

Use Zod schemas for all data that crosses a trust boundary, including AI-generated output. Define schemas in `lib/schemas.ts` and reference them from Gemini modules and API routes. Do not use raw `any` types for structured data.

### UI components

- **shadcn/ui** for primitives -- buttons, cards, badges, inputs, tabs, and other generic UI elements live in `components/ui/`.
- **Custom components** for business logic -- analysis panels, pipeline progress, and prospect cards are standalone components outside `components/ui/`.
- **Server components** are the default in the App Router. Use them for pages and layouts that fetch data.
- **Client components** require the `'use client'` directive. Use them for interactive elements: forms, progress indicators, tabs with state, and anything that uses `useState`, `useEffect`, or browser APIs.

### Imports

Export all Gemini modules through the barrel file at `lib/gemini/index.ts`. Route handlers import from `@/lib/gemini`, not from individual module files.

---

## 4. Adding a New Analysis Stage

This walkthrough covers adding a new stage to the analysis pipeline from schema to UI.

### Step 1: Define the Zod schema

Open `lib/schemas.ts` and add a schema for the new stage's output. This schema is used by Gemini for structured output validation and by TypeScript for type inference.

```typescript
export const NewStageSchema = z.object({
  summary: z.string().describe("Brief summary of findings"),
  // ... your fields here
});

export type NewStage = z.infer<typeof NewStageSchema>;
```

### Step 2: Create the Gemini module

Create a new file at `lib/gemini/new-stage.ts`:

```typescript
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { NewStageSchema } from "@/lib/schemas";

export async function analyseNewStage(
  domain: string,
  // ... inputs from prior stages
) {
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash-preview-05-20"),
      schema: NewStageSchema,
      prompt: `Your prompt here for ${domain}...`,
    });
    return object;
  } catch {
    return { summary: "Analysis unavailable" /* ... fallback fields */ };
  }
}
```

Follow the existing pattern: catch errors and return a degraded result.

### Step 3: Export from the barrel file

Add the export to `lib/gemini/index.ts`:

```typescript
export { analyseNewStage } from './new-stage';
```

### Step 4: Add to the pipeline

Open `app/api/discover/route.ts` and add the new stage to the SSE pipeline. Place it in the correct position relative to other stages, respecting any data dependencies.

```typescript
// Stage N: New stage
send("newstage", { status: "running" })
const newStageResult = await analyseNewStage(domain, /* inputs */)
send("newstage", { status: "complete", data: newStageResult })
```

### Step 5: Update pipeline progress

Open `components/pipeline-progress.tsx` and add the new stage to the `STAGE_LABELS` array:

```typescript
const STAGE_LABELS: { key: string; label: string }[] = [
  // ... existing stages
  { key: 'newstage', label: 'Running new analysis' },
]
```

Also update `components/url-input.tsx` if it references pipeline stages directly.

### Step 6: Create the panel component

Create `components/new-stage-panel.tsx` to render the stage output. Follow the pattern of existing panels (e.g., `tech-stack-panel.tsx`).

### Step 7: Add to the dashboard

Open `app/prospects/[domain]/dashboard-content.tsx` and add the new panel component to the dashboard layout.

### Step 8: Add Cortex storage

Open `lib/cortex-store-pipeline.ts` and add a Cortex node for the new stage data. Follow the existing pattern -- each node is written via `Promise.allSettled` so a single Cortex failure does not block other writes.

### Step 9: Write tests

- Add a unit test at `lib/gemini/__tests__/new-stage.test.ts` -- mock `generateObject` and `google`, verify the function returns structured output and handles errors.
- Update integration tests in `__tests__/integration/` if the new stage affects pipeline flow.

---

## 5. Testing

Lighthouse uses [Vitest](https://vitest.dev/) with V8 coverage.

### Running tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm test -- --coverage
```

### Test locations

| Directory | Purpose |
|---|---|
| `lib/__tests__/` | Unit tests for `lib/` modules (fetcher, pagespeed, cortex, schemas, utils) |
| `lib/gemini/__tests__/` | Unit tests for each Gemini analysis module |
| `__tests__/integration/` | Integration tests for pipeline data flow |

### Test conventions

**Mock external boundaries, not internal modules.** Tests mock the outermost I/O calls:

- **Gemini modules** mock `generateObject` from `ai` and `google` from `@ai-sdk/google`. This verifies that the module constructs the correct prompt and handles both success and error responses.
- **HTTP clients** mock `globalThis.fetch`. This includes tests for the page fetcher, PageSpeed Insights, CrUX, and Cortex.
- **Internal modules** are not mocked. If `storeInCortex` calls `cortexStore`, the test mocks `fetch` (the boundary), not `cortexStore`.

### Coverage

Coverage is collected by V8 and reported in three formats: `text` (console), `lcov` (CI), and `json-summary`. Coverage targets the `lib/` directory, excluding test files. CI uploads coverage reports as artifacts with a 7-day retention.

---

## 6. Commit Convention

Use conventional commit prefixes for all commits:

| Prefix | Use for |
|---|---|
| `feat:` | New features or new analysis stages |
| `fix:` | Bug fixes |
| `test:` | Adding or updating tests |
| `chore:` | Tooling, dependencies, or configuration changes |
| `ci:` | CI/CD workflow changes |
| `docs:` | Documentation updates |

Examples:

```
feat: add competitor analysis stage to pipeline
fix: handle empty CrUX response without crashing
test: add unit tests for architecture schema validation
chore: upgrade ai SDK to v6.1
ci: add coverage upload to CI workflow
docs: add deployment guide
```

A `Co-Authored-By` line is included automatically when commits are created with AI assistance.

---

## 7. Pull Request Process

### Before opening a PR

1. **Run the full CI check locally:**
   ```bash
   npm run lint && npx tsc --noEmit && npm test && npm run build
   ```
   All four checks must pass. CI runs these same checks on every PR.

2. **Write tests for new code.** Every new `lib/` module needs unit tests. Every new Gemini module needs tests that verify structured output and error handling.

3. **Update documentation.** If you add a new feature, API endpoint, or analysis stage, update the relevant docs in `docs/`. If you change environment variables, update `.env.example` and `docs/DEPLOYMENT.md`.

### PR requirements

- CI must pass (lint, typecheck, test, build).
- New code must have test coverage.
- Breaking changes must include a migration note in the PR description.
- Keep PRs focused. One feature or fix per PR.

### What reviewers look for

- Does the code follow the error-handling pattern (catch and degrade, never crash the pipeline)?
- Are Zod schemas defined in `lib/schemas.ts` and used for AI output validation?
- Are external calls mocked at the boundary in tests?
- Does the PR include documentation updates if it changes user-facing behaviour?
