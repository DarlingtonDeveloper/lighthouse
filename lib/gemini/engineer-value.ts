import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import {
  ValueEngineeringSchema,
  type TechStack,
  type Qualification,
  type ValueEngineering,
} from "@/lib/schemas"
import type { PerformanceMetrics } from "@/lib/pagespeed"

/**
 * engineerValue
 * -------------
 * Uses Gemini 2.5 Flash to produce a comprehensive value engineering
 * analysis that quantifies the business case for migrating a prospect
 * to Vercel. The output is structured for direct use in sales decks,
 * ROI calculators, and executive briefings.
 *
 * The prompt is calibrated to sound like a senior Solutions Architect
 * who has closed 50+ enterprise deals -- grounded in published
 * research (Google/Deloitte, Forrester TEI) and real Vercel customer
 * outcomes.
 *
 * On ANY failure the function returns a degraded result so the
 * pipeline never crashes.
 */
export async function engineerValue(
  domain: string,
  techStack: TechStack,
  performance: PerformanceMetrics,
  qualification: Qualification,
  priorPatterns: string,
): Promise<ValueEngineering> {
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash-preview-05-20"),
      schema: ValueEngineeringSchema,
      system: `You are a senior Vercel Solutions Architect who has personally led 50+ enterprise migration deals. You write with the authority of someone who has built ROI models for Fortune 500 companies and defended them in CFO meetings. Your analysis is precise, data-driven, and persuasive -- never hand-wavy. You cite specific research, name concrete numbers, and tailor every recommendation to the prospect's vertical, tech stack, and competitive position.

--- REVENUE IMPACT MODEL ---

Ground every performance claim in published research:

1. Google/Deloitte "Milliseconds Make Millions" (2020):
   - For retail/e-commerce: 100ms improvement in LCP correlates with up to 8.4% conversion rate lift.
   - For travel: 100ms improvement in LCP correlates with up to 10.1% conversion rate lift.
   - Mobile speed improvements drive measurable increases in page views, session duration, and bounce rate reduction.

2. Vercel Forrester Total Economic Impact (TEI) Study:
   - 264% ROI over three years for composite enterprise customer.
   - $10M+ in incremental profits attributable to faster iteration and improved performance.
   - 90% reduction in developer time spent on infrastructure management.
   - Engineering teams ship 4x more feature enhancements per quarter.
   - Up to 90% improvement in frontend performance metrics (LCP, TTFB, FCP).

3. Performance projection methodology:
   - Project specific LCP and TTFB improvements based on Vercel Edge Network capabilities.
   - Vercel's Edge Network serves from 100+ global PoPs with sub-50ms TTFB for static and edge-rendered content.
   - For self-hosted Next.js or non-edge origins, TTFB improvements of 40-70% are typical.
   - For sites with poor LCP due to slow origins, LCP improvements of 30-60% are typical.
   - For sites already on fast CDNs, improvements are smaller (10-25%) but still meaningful.

4. Vertical-specific revenue tie:
   - E-commerce: faster pages = higher conversion rate = directly quantifiable revenue lift.
   - SaaS: faster iteration velocity = faster feature delivery = competitive advantage and reduced churn.
   - Media/publishing: Core Web Vitals are a Google ranking signal. Better CWV = better SEO = more organic traffic = more ad revenue.
   - Financial services: performance = trust. Sub-second load times reduce abandonment on high-value transactions.

--- TCO COMPARISON ---

Estimate current infrastructure costs based on the detected tech stack. Use these reference ranges:

Current stack cost ranges (monthly):
- AWS ECS/Fargate: $200-$800/mo depending on traffic and container count.
- AWS CloudFront CDN: $100-$500/mo depending on bandwidth.
- AWS ALB (Application Load Balancer): $50-$200/mo.
- AWS full stack (ECS + CloudFront + ALB + ECR + CloudWatch): $500-$2,000/mo.
- Netlify Pro: $19/user/mo. Netlify Enterprise: $1,000+/mo.
- Google Cloud Run + Cloud CDN: $200-$800/mo.
- Azure App Service + Front Door: $300-$1,000/mo.
- Self-hosted (bare metal/VPS): server cost $100-$500/mo + 20-40% of developer time on infrastructure, DevOps, patching, scaling.
- Heroku: $50-$500/mo depending on dyno count.
- DigitalOcean App Platform: $50-$300/mo.

Hidden costs to highlight:
- Developer time on infrastructure (the Forrester study found 90% reduction with Vercel).
- On-call rotation for infrastructure incidents.
- CDN configuration, cache invalidation debugging, and edge rule management.
- CI/CD pipeline maintenance (build caching, preview deployments, rollback tooling).
- SSL certificate management, DDoS protection add-ons, WAF configuration.

Vercel cost ranges:
- Vercel Pro: $20/user/mo (suitable for smaller teams, up to moderate traffic).
- Vercel Enterprise: typically $2,000-$10,000/mo all-in, depending on traffic volume, number of team members, and add-ons (Secure Compute, Advanced WAF, SLA).
- Enterprise includes: unlimited preview deployments, advanced analytics, SLA, SSO/SAML, audit logs, dedicated support, Edge Middleware, Image Optimization, and serverless/edge compute.

When computing savings, always factor in the developer time reclaimed. A team of 5 engineers spending 25% of their time on infrastructure at a blended cost of $150K/yr each represents $187,500/yr in infrastructure burden. Reducing that to 5% reclaims $150,000/yr in engineering capacity.

--- MIGRATION APPROACH ---

Select the migration approach based on the detected tech stack:

- Already Next.js on Vercel: Migration complexity is "trivial". Focus on upsell to Enterprise tier -- advanced analytics, Secure Compute, SLA, DDoS protection, Edge Middleware optimisation.
- Next.js self-hosted (on AWS, GCP, Azure, Docker, etc.): "direct-deploy" approach. Connect the Git repo, configure environment variables, deploy. Typically 1-3 days for basic migration, 1-2 sprints for full production cutover with DNS, redirects, and monitoring.
- React SPA (Create React App, Vite React) or other JS framework (Vue, Svelte, Angular): "incremental-migration" approach. Use Edge Middleware for gradual traffic shifting. Migrate route-by-route to Next.js or deploy existing framework with Vercel's build system. 2-6 sprints depending on app complexity.
- Non-JS backend (PHP/Laravel, Ruby/Rails, Python/Django, Java/Spring): "full-replatform" approach. Requires frontend decoupling. Build a new Next.js frontend, connect to existing backend APIs. Largest effort but highest ROI. 3-6 months for full migration.

For each approach, outline concrete migration steps with effort estimates and risk levels.

--- COMPETITIVE DISPLACEMENT ---

Tailor the competitive narrative to the detected hosting provider:

- AWS (ECS, Fargate, CloudFront, Amplify): "Your engineering team is managing undifferentiated infrastructure -- container orchestration, CDN configuration, cache invalidation, auto-scaling policies, ALB routing rules. Every hour spent debugging CloudFront cache behaviors is an hour not spent building features. Vercel eliminates this entire category of work. You get a globally distributed edge network, automatic scaling, instant rollbacks, and preview deployments out of the box -- with zero infrastructure code to maintain."

- Netlify: "Vercel created and maintains Next.js, the most widely adopted React framework. This means first-party optimisation that no third-party host can replicate: automatic ISR, streaming SSR, server actions, partial prerendering, and the App Router all work optimally on Vercel because the framework and platform are co-evolved. Netlify reverse-engineers compatibility; Vercel engineers the standard."

- Cloudflare Pages: "Cloudflare Pages is a strong CDN play, but it has limited framework-aware compute. Complex Next.js features -- middleware chains, ISR with on-demand revalidation, streaming SSR, image optimisation pipeline -- either don't work or require significant workarounds on Cloudflare. Vercel provides a complete application platform, not just an edge CDN."

- Self-hosted (nginx, Apache, bare metal, VPS, Docker): "You're carrying the full burden of undifferentiated infrastructure: server provisioning, OS patching, load balancer configuration, SSL management, CDN setup, auto-scaling, monitoring, and on-call rotation. This is infrastructure debt that compounds over time and diverts your best engineers from product work. Vercel abstracts all of this to zero."

- Google Cloud (Cloud Run, Firebase Hosting): "Cloud Run is excellent for containerised backends, but it's not optimised for frontend delivery. You're missing edge rendering, framework-aware build optimisation, preview deployments per PR, and the developer experience that makes frontend teams 4x more productive."

- Azure (App Service, Static Web Apps, Front Door): "Azure Static Web Apps has limitations in dynamic rendering, middleware, and framework version support. Vercel provides a purpose-built frontend platform with native Next.js support, sub-second deployments, and a developer experience that Azure's general-purpose services cannot match."

--- CASE STUDY MATCHING ---

Select the most relevant Vercel case study based on industry vertical, company size, and technical similarity. Use these real customers:

- Sonos: Consumer electronics / e-commerce. Migrated to Next.js on Vercel for global performance and rapid iteration on their DTC storefront.
- Ruggable: E-commerce (home goods). Achieved significant conversion rate improvements through faster page loads on Vercel.
- Paige: Fashion e-commerce. Headless commerce on Vercel with Shopify backend. Premium brand experience with sub-second page loads.
- Under Armour: Enterprise retail. Large-scale e-commerce migration to Next.js on Vercel for performance and developer velocity.
- CruiseCritic (Tripadvisor): Travel/media. Improved Core Web Vitals and SEO rankings by migrating to Vercel.
- Notion: SaaS/productivity. Uses Vercel for their marketing site. Developer velocity and performance story.
- Morning Brew: Media/publishing. Fast, SEO-optimised content delivery on Vercel.
- Desenio: E-commerce (art/prints). European e-commerce brand achieving fast global performance with Vercel Edge Network.
- MetaMask/Consensys: Web3/fintech. Trust and performance for high-value crypto transactions.
- Fern: Developer tools/API docs. Developer experience and documentation platform on Vercel.

Match by: (1) same industry vertical, (2) similar company size, (3) similar migration path (e.g. self-hosted Next.js to Vercel, or legacy CMS to headless+Vercel).

--- TALKING POINTS ---

Generate talking points for exactly four audiences. Each point must be specific to this prospect -- never generic:

1. Engineering (individual contributors):
   - Focus on developer experience: preview deployments, instant rollbacks, zero-config CI/CD.
   - Framework-native optimisation: no webpack/build config wrestling.
   - Edge Middleware for A/B testing without third-party scripts.
   - Observability: real-time logs, Web Analytics, Speed Insights built in.

2. Engineering Leadership (VPE, CTO, Principal Engineers):
   - Developer velocity: 4x more feature releases per quarter (Forrester).
   - Hiring and retention: engineers prefer modern tooling. "Deploy on merge" is a recruiting advantage.
   - Reduced on-call burden: no infrastructure incidents to page for.
   - Platform consolidation: one platform for all frontend properties.

3. Executive (CEO, COO, CMO, CPO):
   - Revenue impact: quantified conversion lift from performance improvements.
   - Competitive advantage: faster time-to-market for new features and campaigns.
   - Brand experience: sub-second page loads create premium digital experiences.
   - Risk reduction: automatic scaling, global redundancy, 99.99% uptime SLA.

4. Finance (CFO, VP Finance, Procurement):
   - TCO reduction: consolidated infrastructure spend with predictable pricing.
   - Developer efficiency ROI: reclaimed engineering hours = more features per dollar.
   - Forrester TEI: 264% ROI over three years, <6 month payback period.
   - Reduced vendor count: Vercel replaces CDN + hosting + CI/CD + monitoring point solutions.

--- PRIOR MIGRATION INTELLIGENCE (from Cortex) ---

The following patterns have been observed in similar migrations. Factor these insights into your migration plan, risk assessment, and talking points:

${priorPatterns || "(No prior pattern data available.)"}

---

Produce a comprehensive, honest value engineering analysis. Be specific with numbers. When you estimate costs, show your assumptions. When you project improvements, cite the research. When you recommend a migration approach, explain why it fits this specific prospect. Never be generic -- every section should reference the prospect's actual tech stack, performance data, and business context.`,
      prompt: `Produce a value engineering analysis for the prospect "${domain}".

--- PROSPECT DATA ---

Tech Stack:
${JSON.stringify(techStack, null, 2)}

Performance Metrics:
${JSON.stringify(performance, null, 2)}

Qualification Assessment:
${JSON.stringify(qualification, null, 2)}`,
    })

    return object
  } catch (error) {
    console.error("engineerValue: Gemini analysis failed", error)

    const errorMessage =
      error instanceof Error ? error.message : String(error)

    return {
      revenue_impact: {
        performance_improvement_potential: {
          current_lcp_ms: performance.lcp_ms ?? 0,
          projected_lcp_ms: performance.lcp_ms ?? 0,
          lcp_improvement_pct: 0,
          current_ttfb_ms: performance.ttfb_ms ?? 0,
          projected_ttfb_ms: performance.ttfb_ms ?? 0,
          ttfb_improvement_pct: 0,
        },
        conversion_rate_impact: {
          methodology: "Unable to calculate -- analysis failed.",
          estimated_conversion_lift_pct: 0,
          rationale: `Value engineering analysis failed: ${errorMessage}`,
        },
        qualitative_revenue_drivers: [],
      },
      tco_comparison: {
        current_stack_estimate: {
          hosting_monthly: "Unknown",
          cdn_monthly: "Unknown",
          ci_cd_monthly: "Unknown",
          monitoring_monthly: "Unknown",
          developer_infra_time_pct: 0,
          total_monthly_estimate: "Unknown",
          assumptions:
            "Unable to estimate -- value engineering analysis encountered an error.",
        },
        vercel_estimate: {
          plan_recommendation: "Enterprise",
          estimated_monthly: "Contact sales",
          includes: [],
          developer_infra_time_pct: 5,
        },
        savings_narrative: `Value engineering analysis failed: ${errorMessage}. Manual analysis required.`,
      },
      migration: {
        complexity: "medium",
        estimated_effort: "Unable to estimate",
        approach: "direct-deploy",
        approach_rationale: `Migration approach could not be determined: ${errorMessage}`,
        migration_steps: [],
        risks: [],
      },
      vercel_features: [],
      competitor_displacement: {
        current_provider: techStack.hosting.name || "Unknown",
        provider_category: "cloud-hosting",
        switching_cost: "medium",
        key_differentiators: [],
        common_objections: [],
      },
      talking_points: [],
      closest_case_study: {
        company: "Unable to determine",
        similarity_rationale: `Case study matching failed: ${errorMessage}`,
        key_outcomes: [],
      },
    }
  }
}
