# Deployment Guide

This document covers deploying Lighthouse to Vercel, configuring environment variables, enabling Fluid Compute, and setting up optional Cortex integration for persistent storage.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [Deploy to Vercel](#3-deploy-to-vercel)
4. [Enable Fluid Compute](#4-enable-fluid-compute)
5. [Cortex Setup](#5-cortex-setup)
6. [Verify Deployment](#6-verify-deployment)
7. [CI/CD](#7-cicd)
8. [Custom Domain](#8-custom-domain-optional)

---

## 1. Prerequisites

Before deploying, ensure you have the following:

- **Node.js 20+** -- used by both the CI pipeline and the Vercel build environment.
- **Vercel account** -- Pro plan is recommended. The analysis pipeline sets `maxDuration = 60`, which requires the 60-second function timeout available on Pro.
- **Google Gemini API key** -- required. The pipeline makes four `generateObject()` calls to Gemini 2.5 Flash.
- **Cortex instance** (optional but recommended) -- provides persistent graph storage for analysed prospects and prior-pattern retrieval.

---

## 2. Environment Variables

Lighthouse reads four environment variables. Copy `.env.example` to `.env.local` for local development, or set them in your Vercel project settings for production.

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | API key for Google Gemini. Used by the AI SDK to call `generateObject()` across all four analysis stages. |
| `CORTEX_URL` | No | Base URL of your Cortex instance (e.g., `https://cortex.darlington.dev`). If unset, storage and prior-pattern retrieval silently fail and the pipeline still completes. |
| `PSI_API_KEY` | No | Google PageSpeed Insights API key. Increases rate limits for performance metric lookups. Without it, PSI requests use the unauthenticated tier. |
| `CRUX_API_KEY` | No | Chrome UX Report API key. Enables real-user field data lookups for Core Web Vitals. Without it, CrUX data is omitted from performance results. |

### How to obtain each key

- **GOOGLE_GENERATIVE_AI_API_KEY** -- Go to [Google AI Studio](https://aistudio.google.com/apikey), sign in with a Google account, and create an API key. The free tier is sufficient for development.
- **PSI_API_KEY** -- Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create a project (or select an existing one), enable the PageSpeed Insights API, and generate an API key under Credentials.
- **CRUX_API_KEY** -- In the same Google Cloud project, enable the Chrome UX Report API and use the same API key, or generate a separate one.
- **CORTEX_URL** -- See [Cortex Setup](#5-cortex-setup) below.

---

## 3. Deploy to Vercel

Vercel auto-detects Next.js projects. You do not need to configure the framework, build command, or output directory manually.

### Step-by-step

1. **Push your code to GitHub.** Vercel deploys from a connected Git repository.

2. **Import the project in Vercel.** Go to [vercel.com/new](https://vercel.com/new), select your GitHub repository, and click Import.

3. **Set environment variables.** Before the first deploy, add your environment variables in the Vercel project settings:
   - Go to Project Settings > Environment Variables.
   - Add `GOOGLE_GENERATIVE_AI_API_KEY` (required).
   - Add `CORTEX_URL`, `PSI_API_KEY`, and `CRUX_API_KEY` if available.
   - Apply to Production, Preview, and Development environments as needed.

4. **Enable Fluid Compute.** See [section 4](#4-enable-fluid-compute) below. Do this before the first deploy or immediately after.

5. **Deploy.** Click Deploy. Vercel runs `npm run build` automatically and deploys the `.next` output.

### What Vercel auto-detects

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build command | `npm run build` |
| Output directory | `.next` |
| Install command | `npm ci` |

No overrides are needed.

---

## 4. Enable Fluid Compute

Fluid Compute enables in-function concurrency on Vercel serverless functions. It is not enabled by default -- you must turn it on manually.

### How to enable

1. Go to your Vercel project dashboard.
2. Open **Project Settings > Functions**.
3. Find the **Fluid Compute** toggle and enable it.
4. Redeploy if the setting was changed after the initial deploy.

### No code changes needed

Fluid Compute is a runtime-level optimisation. Your code does not need any modifications to benefit from it. The `waitUntil` import from `@vercel/functions` already works with Fluid Compute enabled.

### Why Fluid Compute matters for Lighthouse

The Lighthouse pipeline is almost entirely I/O-bound. A typical analysis involves:

- One `fetch()` call to the prospect website
- One PageSpeed Insights API call
- Four Gemini `generateObject()` calls (tech stack, qualification, value engineering, architecture)
- One Cortex search for prior patterns
- Multiple Cortex writes for storage

With Fluid Compute enabled, the function instance can handle concurrent I/O operations more efficiently, SSE streaming is optimised, and `waitUntil` allows background tasks (Cortex storage) to complete after the response stream closes -- without the user waiting for them.

---

## 5. Cortex Setup

Cortex provides persistent graph storage for analysed prospects. It is optional -- the application works without it. When Cortex is unavailable, storage calls and prior-pattern searches silently fail and the pipeline completes normally.

### Option A: Use the existing deployment

Set `CORTEX_URL` to the existing shared instance:

```
CORTEX_URL=https://cortex.darlington.dev
```

This is the simplest option and requires no infrastructure work.

### Option B: Self-host Cortex

If you need a dedicated instance:

1. **Run Cortex** using Docker or a binary distribution. Refer to the Cortex documentation for installation instructions.

2. **Set the environment variable** to point to your instance:
   ```
   CORTEX_URL=http://localhost:9091
   ```

3. **Expose for Vercel access.** Vercel serverless functions need a publicly routable URL to reach your Cortex instance. Options include:
   - A Cloudflare Tunnel (`cloudflared tunnel`) for zero-config HTTPS exposure.
   - A reverse proxy (nginx, Caddy) on a public server.
   - Any hosting provider that gives you a stable URL.

4. **Update the Vercel environment variable** with your public Cortex URL.

### Degraded mode

When Cortex is unreachable or `CORTEX_URL` is unset:

- `cortexSearchPriorPatterns()` returns an empty result.
- `storeInCortex()` fails silently via `Promise.allSettled`.
- The analysis pipeline completes and streams results to the user as normal.

---

## 6. Verify Deployment

After deploying, verify that the full pipeline works end to end.

### Test the analysis pipeline

1. Open your deployed URL in a browser.
2. Enter a real website URL (e.g., `https://vercel.com`) and run the analysis.
3. Confirm that all six pipeline stages complete: page fetch, tech stack detection, performance measurement, prospect qualification, value engineering, and architecture design.

### Check Cortex connectivity

If you configured Cortex:

1. Run an analysis against any URL.
2. After the stream closes, check your Cortex instance for stored nodes. They should appear within seconds of the analysis completing (stored via `waitUntil` in the background).
3. Visit `/prospects` and verify that the analysed domain appears in the prospect list.

### Verify degraded mode

1. Temporarily remove or invalidate the `CORTEX_URL` environment variable.
2. Run an analysis.
3. Confirm that the pipeline still completes and all results stream to the browser. The only difference is that no data is persisted to Cortex.

---

## 7. CI/CD

Lighthouse uses two GitHub Actions workflows.

### ci.yml -- Continuous Integration

Runs on every push and pull request to `main`. The pipeline has four jobs that run on Node.js 20:

| Job | Command | Purpose |
|---|---|---|
| Lint | `npm run lint` | ESLint checks |
| Type Check | `npx tsc --noEmit` | TypeScript strict mode validation |
| Test | `npm test -- --reporter=verbose --coverage` | Vitest with V8 coverage (uploaded as artifact) |
| Build | `npm run build` | Full Next.js production build |

The Build job depends on Lint, Type Check, and Test all passing. Concurrency is configured so that a new push cancels any in-progress run for the same branch.

### release.yml -- GitHub Releases

Runs when you push a tag matching `v*`. It:

1. Runs the full CI pipeline (reuses `ci.yml`).
2. Generates a changelog from commit messages since the previous tag.
3. Creates a GitHub Release with the changelog.

### Cutting a release

```bash
git tag v1.0.0
git push --tags
```

The release workflow handles the rest. The tag name becomes the release name, and all commits since the previous tag are included in the changelog.

---

## 8. Custom Domain (optional)

To serve Lighthouse from a custom domain:

1. Go to your Vercel project dashboard.
2. Open **Project Settings > Domains**.
3. Add your domain (e.g., `lighthouse.yourcompany.com`).
4. Update your DNS records as instructed by Vercel. Typically this means adding a CNAME record pointing to `cname.vercel-dns.com`.
5. Vercel provisions an SSL certificate automatically.

---

## Quick Reference

| Task | Command / Action |
|---|---|
| Deploy | Push to `main` (auto-deploys if Vercel Git integration is connected) |
| Cut a release | `git tag v1.0.0 && git push --tags` |
| Check CI status | GitHub Actions tab on the repository |
| View build logs | Vercel project dashboard > Deployments |
| Update env vars | Vercel project dashboard > Settings > Environment Variables |
| Enable Fluid Compute | Vercel project dashboard > Settings > Functions > Fluid Compute |
