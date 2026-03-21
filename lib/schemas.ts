import { z } from "zod"

// ---------------------------------------------------------------------------
// Reusable fragments
// ---------------------------------------------------------------------------

const confidenceEnum = z.enum(["high", "medium", "low"])

/** Standard shape for detected technology with confidence + evidence. */
const detectedTech = z.object({
  name: z.string().describe("Name of the detected technology or service"),
  confidence: confidenceEnum.describe("Detection confidence level"),
  evidence: z.string().describe("What signals led to this detection"),
})

// ---------------------------------------------------------------------------
// TechStackSchema
// ---------------------------------------------------------------------------

export const TechStackSchema = z
  .object({
    frontend_framework: z
      .object({
        name: z
          .string()
          .describe(
            "Framework name, e.g. 'Next.js', 'React', 'Vue', 'Angular', 'Astro', 'static HTML'"
          ),
        version: z.string().optional().describe("Detected version string"),
        confidence: confidenceEnum,
        evidence: z
          .string()
          .describe("Signals used to identify the framework"),
        is_nextjs: z.boolean().describe("True when the framework is Next.js"),
        nextjs_version: z
          .string()
          .optional()
          .describe("Major version if Next.js: '12', '13', '14', '15'"),
        uses_app_router: z
          .boolean()
          .optional()
          .describe(
            "True when Next.js App Router (as opposed to Pages Router) is detected"
          ),
        is_self_hosted: z
          .boolean()
          .optional()
          .describe(
            "True when Next.js is detected but NOT hosted on Vercel"
          ),
      })
      .describe("Primary frontend framework detection"),

    rendering_analysis: z
      .object({
        primary_strategy: z
          .enum([
            "SSR",
            "SSG",
            "CSR",
            "ISR",
            "streaming-SSR",
            "hybrid",
            "unknown",
          ])
          .describe("Dominant rendering strategy observed"),
        has_hydration_issues: z
          .boolean()
          .describe(
            "True if signs of hydration mismatch or excessive client-side re-rendering detected"
          ),
        has_stale_while_revalidate: z
          .boolean()
          .describe("True if SWR / stale-while-revalidate caching is in use"),
        client_side_data_fetching: z
          .boolean()
          .describe(
            "True if data is fetched client-side that could instead be server-rendered"
          ),
        evidence: z.string().describe("Signals supporting rendering analysis"),
      })
      .describe("How the site renders and delivers content"),

    hosting: z
      .object({
        name: z.string().describe("Hosting provider name"),
        confidence: confidenceEnum,
        evidence: z.string(),
        is_vercel: z
          .boolean()
          .describe("True if the site is currently hosted on Vercel"),
        estimated_infra_complexity: z
          .enum(["simple", "moderate", "complex"])
          .describe(
            "Rough complexity of the infrastructure behind the site"
          ),
      })
      .describe("Hosting / infrastructure provider detection"),

    cdn: detectedTech.describe("Content Delivery Network detection"),

    cms: detectedTech
      .optional()
      .describe("Content Management System, if detected"),
    commerce: detectedTech
      .optional()
      .describe("Commerce / e-commerce platform, if detected"),
    search: detectedTech
      .optional()
      .describe("Site-search provider, if detected"),
    media_dam: detectedTech
      .optional()
      .describe("Media / Digital Asset Management service, if detected"),
    ab_testing: detectedTech
      .optional()
      .describe("A/B testing or feature-flag platform, if detected"),
    personalization: detectedTech
      .optional()
      .describe("Personalization engine, if detected"),
    auth: detectedTech
      .optional()
      .describe("Authentication provider, if detected"),
    payments: detectedTech
      .optional()
      .describe("Payment processing provider, if detected"),
    monitoring: detectedTech
      .optional()
      .describe("Monitoring / observability platform, if detected"),

    analytics: z
      .array(
        z.object({
          name: z.string().describe("Analytics tool name"),
          evidence: z.string().describe("How it was detected"),
        })
      )
      .describe("All analytics & tracking tools found on the site"),

    api_patterns: z
      .object({
        detected_endpoints: z
          .array(z.string())
          .describe("API endpoint paths observed in network traffic"),
        api_style: z
          .string()
          .describe(
            "API paradigm: 'REST', 'GraphQL', 'tRPC', or 'none detected'"
          ),
        has_bff_layer: z
          .boolean()
          .describe(
            "True if a Backend-for-Frontend layer sits between client and services"
          ),
        has_middleware: z
          .boolean()
          .describe(
            "True if edge/server middleware rewrites or proxies requests"
          ),
      })
      .optional()
      .describe("API and data-fetching patterns observed"),

    third_party_scripts: z
      .array(
        z.object({
          name: z.string().describe("Script or service name"),
          purpose: z
            .string()
            .describe("What the script does (analytics, chat, ads, etc.)"),
          url_pattern: z
            .string()
            .describe("URL or domain pattern the script loads from"),
          estimated_impact: z
            .enum(["high", "medium", "low"])
            .describe("Estimated performance impact on page load"),
        })
      )
      .describe("Third-party scripts loaded by the page"),

    composable_maturity: z
      .enum([
        "monolithic",
        "partially-decoupled",
        "headless",
        "fully-composable",
      ])
      .describe(
        "How composable the architecture is -- from tightly-coupled monolith to fully-composable MACH"
      ),

    meta_framework_signals: z
      .array(z.string())
      .describe(
        "Additional framework or meta-framework indicators found (e.g. Turbopack, Webpack chunks, SWC)"
      ),
  })
  .describe(
    "Comprehensive composable architecture detection for a prospect website"
  )

// ---------------------------------------------------------------------------
// QualificationSchema
// ---------------------------------------------------------------------------

export const QualificationSchema = z
  .object({
    deal_score: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "Overall deal quality score 0-100. Higher means stronger sales opportunity"
      ),

    traffic_tier: z
      .enum(["enterprise", "mid-market", "smb", "unknown"])
      .describe("Estimated traffic tier based on observable signals"),

    migration_signals: z
      .object({
        hiring_frontend: z
          .boolean()
          .describe(
            "True if the company appears to be hiring frontend engineers"
          ),
        hiring_signals: z
          .array(z.string())
          .describe("Job titles or roles found in hiring pages"),
        mentions_headless: z
          .boolean()
          .describe(
            "True if headless, composable, or jamstack terms appear on the site or job postings"
          ),
        recent_replatform: z
          .boolean()
          .describe(
            "True if evidence suggests a recent or in-progress platform migration"
          ),
        evidence: z
          .string()
          .describe("Summary of evidence for migration signals"),
      })
      .describe("Signals that the prospect may be ready to migrate"),

    vercel_fit: z
      .object({
        score: z
          .enum(["strong", "moderate", "weak"])
          .describe("How well this prospect fits Vercel's ideal customer profile"),
        rationale: z
          .string()
          .describe("Explanation of the fit score"),
        already_on_vercel: z
          .boolean()
          .describe("True if the site is already deployed on Vercel"),
        blockers: z
          .array(z.string())
          .describe(
            "Factors that could prevent or slow Vercel adoption"
          ),
        accelerators: z
          .array(z.string())
          .describe(
            "Factors that would accelerate Vercel adoption"
          ),
      })
      .describe("Assessment of prospect fit for Vercel platform"),

    company_profile: z
      .object({
        estimated_size: z
          .enum(["startup", "scaleup", "mid-market", "enterprise", "unknown"])
          .describe("Estimated company size tier"),
        industry_vertical: z
          .string()
          .describe("Primary industry vertical (e.g. 'e-commerce', 'fintech', 'media')"),
        b2b_or_b2c: z
          .enum(["B2B", "B2C", "both", "unknown"])
          .describe("Business model orientation"),
      })
      .describe("High-level company profile"),

    recommended_action: z
      .enum([
        "immediate-outreach",
        "schedule-discovery-call",
        "add-to-nurture",
        "deprioritise",
        "already-on-vercel",
      ])
      .describe("Recommended next step for the sales team"),

    action_rationale: z
      .string()
      .describe("Why this action was recommended"),
  })
  .describe("Sales qualification assessment for a prospect")

// ---------------------------------------------------------------------------
// ValueEngineeringSchema
// ---------------------------------------------------------------------------

export const ValueEngineeringSchema = z
  .object({
    revenue_impact: z
      .object({
        performance_improvement_potential: z
          .object({
            current_lcp_ms: z
              .number()
              .describe("Current Largest Contentful Paint in milliseconds"),
            projected_lcp_ms: z
              .number()
              .describe("Projected LCP after Vercel migration"),
            lcp_improvement_pct: z
              .number()
              .describe("LCP improvement percentage"),
            current_ttfb_ms: z
              .number()
              .describe("Current Time to First Byte in milliseconds"),
            projected_ttfb_ms: z
              .number()
              .describe("Projected TTFB after Vercel migration"),
            ttfb_improvement_pct: z
              .number()
              .describe("TTFB improvement percentage"),
          })
          .describe("Quantified performance gains from migration"),
        conversion_rate_impact: z
          .object({
            methodology: z
              .string()
              .describe(
                "How the conversion lift was estimated (e.g. industry benchmarks, Deloitte study)"
              ),
            estimated_conversion_lift_pct: z
              .number()
              .describe("Estimated percentage lift in conversion rate"),
            rationale: z
              .string()
              .describe("Narrative explaining the conversion impact"),
          })
          .describe("Conversion rate improvement estimate"),
        qualitative_revenue_drivers: z
          .array(z.string())
          .describe(
            "Non-quantifiable revenue benefits (e.g. better SEO, improved brand perception)"
          ),
      })
      .describe("Revenue and business impact analysis"),

    tco_comparison: z
      .object({
        current_stack_estimate: z
          .object({
            hosting_monthly: z
              .string()
              .describe("Estimated monthly hosting cost"),
            cdn_monthly: z
              .string()
              .describe("Estimated monthly CDN cost"),
            ci_cd_monthly: z
              .string()
              .describe("Estimated monthly CI/CD cost"),
            monitoring_monthly: z
              .string()
              .describe("Estimated monthly monitoring cost"),
            developer_infra_time_pct: z
              .number()
              .describe(
                "Percentage of developer time spent on infrastructure vs features"
              ),
            total_monthly_estimate: z
              .string()
              .describe("Total estimated monthly infrastructure cost"),
            assumptions: z
              .string()
              .describe("Key assumptions behind these estimates"),
          })
          .describe("Estimated cost of the current infrastructure stack"),
        vercel_estimate: z
          .object({
            plan_recommendation: z
              .enum(["Pro", "Enterprise"])
              .describe("Recommended Vercel plan tier"),
            estimated_monthly: z
              .string()
              .describe("Estimated monthly Vercel cost"),
            includes: z
              .array(z.string())
              .describe("What is included in the Vercel plan"),
            developer_infra_time_pct: z
              .number()
              .describe(
                "Projected developer time on infrastructure after migration"
              ),
          })
          .describe("Projected Vercel cost estimate"),
        savings_narrative: z
          .string()
          .describe(
            "Plain-language summary of cost savings and efficiency gains"
          ),
      })
      .describe("Total Cost of Ownership comparison"),

    migration: z
      .object({
        complexity: z
          .enum(["trivial", "low", "medium", "high"])
          .describe("Overall migration complexity assessment"),
        estimated_effort: z
          .string()
          .describe(
            "Estimated effort in person-weeks or sprints"
          ),
        approach: z
          .enum([
            "direct-deploy",
            "incremental-migration",
            "frontend-rewrite",
            "full-replatform",
          ])
          .describe("Recommended migration approach"),
        approach_rationale: z
          .string()
          .describe("Why this approach was chosen"),
        migration_steps: z
          .array(
            z.object({
              step: z.number().describe("Step number in sequence"),
              title: z.string().describe("Step title"),
              description: z
                .string()
                .describe("What this step involves"),
              effort: z
                .string()
                .describe("Estimated effort for this step"),
              risk_level: z
                .enum(["low", "medium", "high"])
                .describe("Risk level of this step"),
            })
          )
          .describe("Ordered migration plan steps"),
        risks: z
          .array(
            z.object({
              risk: z.string().describe("Description of the risk"),
              mitigation: z
                .string()
                .describe("How to mitigate this risk"),
              severity: z
                .enum(["low", "medium", "high"])
                .describe("Severity if the risk materialises"),
            })
          )
          .describe("Key risks and mitigations for the migration"),
      })
      .describe("Migration plan and complexity assessment"),

    vercel_features: z
      .array(
        z.object({
          feature: z
            .string()
            .describe("Vercel feature name (e.g. Edge Functions, Image Optimization)"),
          relevance_to_prospect: z
            .string()
            .describe("Why this feature matters for this specific prospect"),
          priority: z
            .enum(["critical", "high", "medium", "low"])
            .describe("How important this feature is for the deal"),
          category: z
            .enum([
              "performance",
              "developer-experience",
              "security",
              "observability",
              "ai",
              "commerce",
            ])
            .describe("Feature category"),
        })
      )
      .describe("Relevant Vercel features mapped to prospect needs"),

    competitor_displacement: z
      .object({
        current_provider: z
          .string()
          .describe("Current hosting or platform provider being displaced"),
        provider_category: z
          .enum([
            "cloud-hosting",
            "edge-platform",
            "monolithic-cms",
            "self-hosted",
          ])
          .describe("Category of the current provider"),
        switching_cost: z
          .enum(["trivial", "low", "medium", "high"])
          .describe("Estimated cost and effort of switching"),
        key_differentiators: z
          .array(z.string())
          .describe(
            "Vercel advantages over the current provider"
          ),
        common_objections: z
          .array(
            z.object({
              objection: z
                .string()
                .describe("Common objection prospects raise"),
              response: z
                .string()
                .describe("Recommended response to the objection"),
            })
          )
          .describe("Anticipated objections with prepared responses"),
      })
      .describe("Competitive displacement analysis"),

    talking_points: z
      .array(
        z.object({
          point: z.string().describe("The talking point"),
          audience: z
            .enum([
              "engineering",
              "engineering-leadership",
              "executive",
              "finance",
            ])
            .describe("Target audience for this talking point"),
          supporting_data: z
            .string()
            .describe("Data or evidence that backs up the point"),
        })
      )
      .describe("Audience-tailored talking points for sales conversations"),

    closest_case_study: z
      .object({
        company: z
          .string()
          .describe("Company name from Vercel case studies"),
        similarity_rationale: z
          .string()
          .describe("Why this case study is relevant to the prospect"),
        key_outcomes: z
          .array(z.string())
          .describe("Headline outcomes from the case study"),
        reference_url: z
          .string()
          .optional()
          .describe("URL to the Vercel case study"),
      })
      .describe("Most relevant Vercel case study for this prospect"),
  })
  .describe(
    "Value engineering analysis quantifying the business case for Vercel migration"
  )

// ---------------------------------------------------------------------------
// ArchitectureSchema
// ---------------------------------------------------------------------------

export const ArchitectureSchema = z
  .object({
    current_architecture: z
      .object({
        mermaid_diagram: z
          .string()
          .describe(
            "Mermaid graph TD diagram showing the current architecture components and data flow"
          ),
        description: z
          .string()
          .describe("Plain-language description of the current architecture"),
        pain_points: z
          .array(z.string())
          .describe(
            "Key pain points and limitations of the current architecture"
          ),
      })
      .describe("Analysis of the prospect's current architecture"),

    target_architecture: z
      .object({
        mermaid_diagram: z
          .string()
          .describe(
            "Mermaid graph TD diagram showing the proposed Vercel-powered architecture"
          ),
        description: z
          .string()
          .describe(
            "Plain-language description of the proposed target architecture"
          ),
        key_changes: z
          .array(
            z.object({
              component: z
                .string()
                .describe("Architecture component being changed"),
              from: z.string().describe("Current state of this component"),
              to: z.string().describe("Proposed new state"),
              benefit: z
                .string()
                .describe("Benefit of making this change"),
            })
          )
          .describe("Summary of key architectural changes"),
      })
      .describe("Proposed target architecture on Vercel"),

    poc_proposal: z
      .object({
        title: z.string().describe("POC project title"),
        scope: z
          .string()
          .describe("What the POC will cover and what it will not"),
        approach: z
          .string()
          .describe("Technical approach for the POC"),
        duration: z
          .string()
          .describe("Estimated POC duration (e.g. '2 weeks', '1 sprint')"),
        success_criteria: z
          .array(
            z.object({
              metric: z.string().describe("Metric to measure"),
              current_value: z
                .string()
                .describe("Current baseline value"),
              target_value: z
                .string()
                .describe("Target value to demonstrate success"),
            })
          )
          .describe("Measurable success criteria for the POC"),
        required_from_prospect: z
          .array(z.string())
          .describe(
            "What the prospect needs to provide for the POC (access, data, stakeholders)"
          ),
        vercel_resources: z
          .array(z.string())
          .describe(
            "Vercel resources to be allocated (SA time, trial credits, etc.)"
          ),
        risk_mitigation: z
          .string()
          .describe("How risks will be managed during the POC"),
      })
      .describe("Proof of Concept proposal to validate the migration"),
  })
  .describe(
    "Architecture analysis with current-state, target-state diagrams and POC proposal"
  )

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type TechStack = z.infer<typeof TechStackSchema>
export type Qualification = z.infer<typeof QualificationSchema>
export type ValueEngineering = z.infer<typeof ValueEngineeringSchema>
export type Architecture = z.infer<typeof ArchitectureSchema>
