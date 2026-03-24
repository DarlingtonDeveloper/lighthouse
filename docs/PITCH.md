# Lighthouse — Pitch Script

## The One-Liner

Lighthouse is an AI-powered deal qualification engine that analyses any website and produces a complete enterprise sales package — tech stack detection, performance audit, deal score, migration strategy, architecture diagrams, and talking points — in under 60 seconds.

---

## Opening (30 seconds)

"Every Vercel enterprise AE spends hours manually researching prospects before a first call. They're tabbing between BuiltWith, PageSpeed Insights, LinkedIn, the prospect's source code, and a dozen internal docs trying to answer one question: *is this deal worth pursuing, and if so, what's the pitch?*

Lighthouse answers that in a single URL."

---

## The Problem (45 seconds)

Enterprise sales teams face three bottlenecks in the qualification stage:

1. **Time sink** — An AE manually researching a prospect takes 2-4 hours. That's time not spent selling. Multiply that across 50 prospects a month and you've lost an entire headcount to research.

2. **Inconsistency** — Every rep qualifies differently. One focuses on tech stack, another on traffic, another on gut feel. There's no standardised framework, which means pipeline reviews are subjective and forecasting is unreliable.

3. **Missed context** — Reps don't have access to the full picture. They miss performance bottlenecks that would make the deal urgent, they miss migration patterns from similar customers, and they miss competitive displacement opportunities hiding in the prospect's infrastructure.

---

## The Solution (60 seconds)

"You paste a URL. Lighthouse does the rest.

It fetches the page, runs it through Google's Gemini 2.5 Pro to detect the full tech stack — framework, hosting, CDN, CMS, commerce platform, analytics, third-party scripts, rendering strategy. Simultaneously, it pulls real performance data from PageSpeed Insights and the Chrome UX Report.

Then it qualifies the prospect. Not with a simple checklist — with a structured analysis that scores Vercel fit, traffic tier, migration complexity, and competitive positioning. It produces a deal score from 0-100 and a recommended action: immediate outreach, schedule discovery, add to nurture, or deprioritise.

Then it goes further. It engineers the value proposition — ROI projections, TCO comparison, migration strategy with step-by-step phases, risk assessment, and case study matching to existing Vercel customers with similar profiles.

Finally, it generates architecture diagrams — current state and target state — and a concrete proof-of-concept proposal with success criteria, timeline, and required resources.

The entire pipeline runs in under 60 seconds. What took an AE half a day is now a URL and a click."

---

## Demo Flow (walk through the app)

### 1. Landing Page
"This is Lighthouse. Simple interface — paste a URL, hit analyse. Let's try [prospect domain]."

### 2. Pipeline Progress
"You can see the six-stage pipeline running in real time:
- **Fetch** — grabs the page HTML and headers
- **Tech Stack** + **Performance** — run in parallel. Gemini analyses the source while PSI runs a Lighthouse audit
- **Qualification** — scores the deal based on everything we've found
- **Value Engineering** — builds the business case
- **Architecture** — generates diagrams and a PoC proposal

Each stage streams results as they complete. No waiting for the full pipeline."

### 3. Dashboard — Header
"Here's the result. Deal score of [X] out of 100, recommended action: [action]. The AE knows immediately whether to pursue this."

### 4. Qualification Panel
"The qualification breaks down into Vercel fit, traffic tier, company profile, and migration signals. It even scrapes careers pages for hiring signals — if they're hiring frontend engineers, that's a buying signal."

### 5. Tech Stack Panel
"Full tech stack detection: framework, hosting, CDN, rendering strategy, composable maturity score. This tells the AE exactly what they're walking into."

### 6. Performance Panel
"Real Core Web Vitals — LCP, CLS, INP, TTFB — with lab and field data. If the prospect has performance problems, this is the urgency lever. 'Your LCP is 4.2 seconds — that's costing you X% in conversions.'"

### 7. Value Engineering Panel
"This is where it gets powerful. Revenue impact projections, TCO comparison between their current stack and Vercel, migration roadmap with effort estimates and risk levels, and the closest case study match from Vercel's customer base."

### 8. Architecture Panel
"Current state and target state architecture diagrams — rendered as Mermaid flowcharts. The AE can drop these straight into a customer deck. Below that, a concrete PoC proposal with scope, timeline, success criteria, and what's needed from the prospect."

### 9. Talking Points Panel
"Pre-written talking points segmented by audience — VP Engineering, CTO, CFO. Each one is calibrated to the prospect's specific situation, not generic."

---

## Technical Differentiators (30 seconds)

- **Gemini 2.5 Pro** with structured output (Zod schemas) — not free-text generation, but typed, validated objects
- **Real performance data** — PSI + CrUX, not estimates
- **Cortex graph memory** — every analysis is stored. The system learns patterns across prospects. "We've seen 15 React-on-AWS migrations — here's what worked."
- **Streaming SSE pipeline** — results appear as they're ready, not after the full pipeline completes
- **Built on Next.js + Vercel** — dogfooding the platform we're selling

---

## Cortex Memory Layer (30 seconds)

"Lighthouse doesn't just analyse and forget. Every prospect, every tech stack detection, every migration pattern, every qualification score gets stored in Cortex — our graph memory engine.

Over time, this builds institutional knowledge. When Lighthouse analyses a new React-on-AWS prospect, it can pull migration patterns from every similar prospect we've already analysed. The system gets smarter with every deal.

This also means AEs can come back to a prospect weeks later and the full analysis is still there — no re-running, no lost context."

---

## Business Impact (30 seconds)

| Metric | Before | After |
|--------|--------|-------|
| Time to qualify a prospect | 2-4 hours | < 60 seconds |
| Qualification consistency | Subjective, varies by rep | Standardised 0-100 score |
| Pipeline coverage | ~30 prospects/month per AE | Unlimited |
| PoC proposal quality | Manual, generic templates | Auto-generated, prospect-specific |
| Institutional knowledge | Lost when reps leave | Persisted in Cortex graph |

---

## Competitive Positioning

"There are tools that do parts of this — BuiltWith for tech detection, Similarweb for traffic, 6sense for intent signals. But none of them:

1. Combine all signals into a single qualified view
2. Generate the actual sales materials (talking points, architecture diagrams, PoC proposals)
3. Build a learning memory layer across all prospects
4. Do it in under 60 seconds from a single URL

Lighthouse isn't a research tool. It's a deal acceleration engine."

---

## Ask / Next Steps

**For internal pitch (Vercel sales leadership):**
"We'd like to pilot Lighthouse with 3 AEs for 30 days. Success criteria: reduction in qualification time, improvement in pipeline accuracy, and AE satisfaction scores. If the pilot works, we roll it out to the full enterprise team."

**For external pitch (potential customers/partners):**
"Lighthouse is built on the Vercel platform — it's proof of what you can build with Next.js, Vercel AI SDK, and edge computing. We'd love to walk through your specific use case and show you what the analysis looks like for your site."

---

## Objection Handling

**"How accurate is the AI?"**
"The tech stack detection uses Gemini 2.5 Pro analysing actual page source code and HTTP headers — not a database lookup. Performance data comes directly from Google's own PageSpeed Insights and Chrome UX Report. The qualification score is a structured framework, not a hallucination. And every output is validated against a Zod schema, so you never get malformed data."

**"What if Cortex is down?"**
"Cortex is a best-effort enhancement. If it's unavailable, the pipeline still runs end-to-end — you just don't get prior pattern matching. The core analysis is self-contained."

**"Can reps trust a 0-100 score?"**
"The score is transparent. Every factor is broken down — Vercel fit, traffic tier, migration complexity, competitive positioning. The rep can see exactly why a prospect scored 72 vs 45. It's a starting point for conversation, not a black box."

**"What about data privacy?"**
"Lighthouse only analyses publicly accessible web pages. It doesn't access any private systems, internal tools, or customer data. The analysis is based on the same information anyone can see by visiting the website."
