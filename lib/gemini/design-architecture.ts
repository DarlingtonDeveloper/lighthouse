import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import {
  ArchitectureSchema,
  type TechStack,
  type ValueEngineering,
  type Architecture,
} from "@/lib/schemas"
import type { PerformanceMetrics } from "@/lib/pagespeed"

/**
 * designArchitecture
 * ------------------
 * Uses Gemini 2.5 Flash to produce current-state and target-state
 * architecture diagrams (Mermaid) plus a concrete PoC proposal for
 * migrating a prospect to Vercel.
 *
 * The prompt is calibrated to produce diagrams that a Solutions
 * Architect can drop straight into a customer-facing deck.
 *
 * On ANY failure the function returns empty diagrams and a generic
 * PoC so the pipeline never crashes.
 */
export async function designArchitecture(
  domain: string,
  techStack: TechStack,
  performance: PerformanceMetrics,
  valueEngineering: ValueEngineering,
): Promise<Architecture> {
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-pro"),
      schema: ArchitectureSchema,
      prompt: `You are a senior Vercel Solutions Architect designing architecture diagrams and a proof-of-concept proposal for the prospect "${domain}".

--- TASK 1: CURRENT ARCHITECTURE DIAGRAM ---

Produce a Mermaid flowchart (graph TD) that maps the prospect's current architecture based on the detected tech stack and performance data.

Requirements:
- Start with "graph TD" on the first line.
- Show the full request path: User --> CDN --> Hosting/Origin --> Backend services --> Data stores.
- Include ALL detected composable components as separate nodes: CMS, commerce platform, search, media/DAM, A/B testing, personalization, auth, payments, monitoring, and analytics.
- Connect components with labelled edges where the relationship is clear (e.g. "API", "GraphQL", "webhook", "SDK").
- Annotate performance bottlenecks directly in the diagram using Mermaid comments or node labels. For example, if TTFB is slow, annotate the origin node with the TTFB value. If third-party scripts are a drag, annotate them with their estimated impact.
- Use descriptive node IDs (e.g. "CDN[Cloudflare CDN]", "Origin[AWS ECS]", "CMS[Contentful]").
- If a component was not detected, do not include it -- only show what was actually found.
- Keep the diagram clean and readable. Group related components vertically where possible.

CRITICAL Mermaid syntax rules -- you MUST follow these:
- NEVER use parentheses () inside node labels. Use dashes or commas instead. BAD: "Node[Express.js (BFF)]". GOOD: "Node[Express.js - BFF]".
- NEVER use ampersands & inside labels. Use "and" or "+" instead.
- NEVER use angle brackets < > inside labels.
- NEVER use double quotes inside labels. Use single quotes if needed.
- NEVER use semicolons inside labels. Use commas instead.
- NEVER wrap the diagram in markdown code fences.
- Keep node labels SHORT -- max 40 characters. Put details in subgraph titles or edge labels instead.
- Use simple alphanumeric node IDs (e.g. "EdgeNet", "NextApp", "NASAAPI") -- avoid special characters in IDs.

--- TASK 2: TARGET ARCHITECTURE DIAGRAM ---

Produce a Mermaid flowchart (graph TD) showing the proposed Vercel target state.

Requirements:
- Start with "graph TD" on the first line.
- Show the Vercel Edge Network as the entry point for all user traffic.
- Show Next.js as the frontend application layer. Choose the appropriate rendering strategy based on the prospect's current patterns:
  - If currently SSR: propose streaming SSR with React Server Components.
  - If currently SSG: propose ISR with on-demand revalidation.
  - If currently CSR: propose SSR/SSG hybrid to eliminate client-side loading states.
  - If currently hybrid: propose optimised hybrid with edge rendering for critical paths.
- Include Vercel Image Optimization as a node for any media/image pipelines.
- Include Vercel Analytics + Speed Insights as an observability node.
- Show existing backend APIs, databases, and third-party services UNCHANGED -- Vercel replaces only the frontend delivery layer, not the backend.
- If the current stack has security concerns (WAF, DDoS, bot protection), include Vercel WAF as a node.
- Include Edge Middleware as a node if the prospect would benefit from A/B testing, geo-routing, authentication at the edge, or gradual migration (reverse proxy).
- Use descriptive node IDs matching the current architecture where applicable so the viewer can see what changed.
- Annotate expected performance improvements on relevant edges or nodes (e.g. "TTFB < 50ms", "Global edge delivery").
- Follow the same CRITICAL Mermaid syntax rules from Task 1: no parentheses, ampersands, angle brackets, or double quotes inside node labels. Keep labels under 40 characters.

--- TASK 3: PROOF OF CONCEPT PROPOSAL ---

Design a minimal, high-impact proof of concept that de-risks the migration and demonstrates measurable value.

Page selection rules (STRICTLY follow these):
- E-commerce sites: pick the HOMEPAGE or a category/collection page. NEVER pick checkout, cart, or account pages.
- SaaS sites: pick the MARKETING/LANDING page. NEVER pick the core application, dashboard, or auth flows.
- Media/publishing sites: pick a high-traffic CONTENT page or the homepage. NEVER pick admin or CMS pages.
- General sites: pick the HOMEPAGE. It is the highest-traffic, lowest-risk page.

Technical approach:
- Use the Edge Middleware reverse proxy pattern: Vercel serves the PoC page(s) with Next.js while ALL other routes are transparently proxied back to the existing infrastructure via Edge Middleware rewrites.
- This means ZERO disruption to existing pages -- they continue to be served from the current infrastructure unchanged.
- The prospect can compare performance side-by-side on the same domain.
- Instant rollback: if anything goes wrong, remove the DNS change and traffic returns to the existing infrastructure within TTL (typically 60 seconds).

Success criteria (be specific -- tie to numbers):
- TTFB < 100ms at the edge (current baseline from performance data as comparison).
- LCP improvement > 40% compared to current baseline.
- Lighthouse Performance score > 90.
- Zero downtime during cutover and rollback.
- Build time < 2 minutes for the PoC pages.
- Include any vertical-specific metrics (e.g. bounce rate for media, conversion rate for e-commerce).

PoC logistics:
- Duration: 1-2 weeks typical. Adjust based on migration complexity from the value engineering data.
- Required from prospect: source code repository access, environment variables and API keys for backend services, DNS management access (or ability to add a CNAME).
- Risk mitigation: emphasise the reverse proxy approach means the existing site continues to work unchanged, and rollback is instant. No data migration, no backend changes, no breaking existing functionality.

--- PROSPECT DATA ---

Tech Stack:
${JSON.stringify(techStack, null, 2)}

Performance Metrics:
${JSON.stringify(performance, null, 2)}

Value Engineering Analysis:
${JSON.stringify(valueEngineering, null, 2)}

--- INSTRUCTIONS ---

Produce all three outputs. The Mermaid diagrams must be valid Mermaid syntax (graph TD). The PoC proposal must be specific to this prospect -- reference their actual tech stack, hosting provider, and performance numbers. Never be generic.`,
    })

    return object
  } catch (error) {
    console.error("designArchitecture: Gemini analysis failed", error)

    return {
      current_architecture: {
        mermaid_diagram: `graph TD\n  User[User] --> Origin[${techStack.hosting.name || "Origin"}]\n  Origin --> App[${techStack.frontend_framework.name || "Application"}]`,
        description:
          "Architecture diagram generation failed. A basic diagram has been provided based on detected hosting and framework.",
        pain_points: [
          "Unable to generate detailed architecture analysis due to an internal error.",
        ],
      },
      target_architecture: {
        mermaid_diagram: `graph TD\n  User[User] --> Edge[Vercel Edge Network]\n  Edge --> NextJS[Next.js on Vercel]\n  NextJS --> Backend[Existing Backend APIs]`,
        description:
          "Target architecture diagram generation failed. A standard Vercel target-state diagram has been provided.",
        key_changes: [
          {
            component: "Frontend Delivery",
            from: techStack.hosting.name || "Current hosting",
            to: "Vercel Edge Network + Next.js",
            benefit:
              "Global edge delivery with sub-50ms TTFB and framework-native optimisations.",
          },
        ],
      },
      poc_proposal: {
        title: `${domain} - Vercel PoC: Homepage Migration`,
        scope:
          "Migrate the homepage to Next.js on Vercel using Edge Middleware reverse proxy. All other pages remain on existing infrastructure unchanged.",
        approach:
          "Deploy a Next.js application on Vercel serving the homepage. Use Edge Middleware to reverse-proxy all other routes to the existing origin. Compare performance side-by-side on the same domain.",
        duration: "1-2 weeks",
        success_criteria: [
          {
            metric: "Time to First Byte (TTFB)",
            current_value: performance.ttfb_ms
              ? `${Math.round(performance.ttfb_ms)}ms`
              : "Unknown",
            target_value: "< 100ms",
          },
          {
            metric: "Largest Contentful Paint (LCP)",
            current_value: performance.lcp_ms
              ? `${Math.round(performance.lcp_ms)}ms`
              : "Unknown",
            target_value: performance.lcp_ms
              ? `< ${Math.round(performance.lcp_ms * 0.6)}ms (40%+ improvement)`
              : "40%+ improvement over baseline",
          },
          {
            metric: "Lighthouse Performance Score",
            current_value: performance.performance_score
              ? `${performance.performance_score}`
              : "Unknown",
            target_value: "> 90",
          },
        ],
        required_from_prospect: [
          "Source code repository access",
          "Environment variables and API keys for backend services",
          "DNS management access (ability to add a CNAME record)",
        ],
        vercel_resources: [
          "Solutions Architect time (architecture review and migration support)",
          "Vercel Enterprise trial account",
          "Technical support escalation path",
        ],
        risk_mitigation:
          "The Edge Middleware reverse proxy approach ensures zero disruption to the existing site. All non-PoC routes are transparently proxied to the current infrastructure. Rollback is instant -- remove the DNS change and traffic returns to the existing origin within TTL (typically 60 seconds). No data migration, no backend changes, no risk to existing functionality.",
      },
    }
  }
}
