import {
  TechStackSchema,
  QualificationSchema,
  ValueEngineeringSchema,
  ArchitectureSchema,
} from "../schemas"

// ---------------------------------------------------------------------------
// Minimal valid fixtures
// ---------------------------------------------------------------------------

const validTechStack = {
  frontend_framework: {
    name: "Next.js",
    version: "14.1.0",
    confidence: "high",
    evidence: "Detected __next div and _next/static assets",
    is_nextjs: true,
    nextjs_version: "14",
    uses_app_router: true,
    is_self_hosted: false,
  },
  rendering_analysis: {
    primary_strategy: "SSR",
    has_hydration_issues: false,
    has_stale_while_revalidate: true,
    client_side_data_fetching: false,
    evidence: "Server-rendered HTML with hydration markers",
  },
  hosting: {
    name: "Vercel",
    confidence: "high",
    evidence: "x-vercel-id header present",
    is_vercel: true,
    estimated_infra_complexity: "simple",
  },
  cdn: {
    name: "Vercel Edge Network",
    confidence: "high",
    evidence: "Edge caching headers detected",
  },
  analytics: [
    { name: "Google Analytics 4", evidence: "gtag.js script detected" },
  ],
  third_party_scripts: [
    {
      name: "Intercom",
      purpose: "Customer chat widget",
      url_pattern: "widget.intercom.io",
      estimated_impact: "medium",
    },
  ],
  composable_maturity: "headless",
  meta_framework_signals: ["SWC compiler", "Turbopack"],
}

const validQualification = {
  deal_score: 78,
  traffic_tier: "mid-market",
  migration_signals: {
    hiring_frontend: true,
    hiring_signals: ["Senior Frontend Engineer", "Staff Platform Engineer"],
    mentions_headless: true,
    recent_replatform: false,
    evidence: "Job postings mention headless CMS migration",
  },
  vercel_fit: {
    score: "strong",
    rationale: "Next.js app self-hosted on AWS, strong migration candidate",
    already_on_vercel: false,
    blockers: ["Enterprise security review required"],
    accelerators: ["Already using Next.js", "Active frontend hiring"],
  },
  company_profile: {
    estimated_size: "mid-market",
    industry_vertical: "e-commerce",
    b2b_or_b2c: "B2C",
  },
  recommended_action: "schedule-discovery-call",
  action_rationale:
    "Strong Next.js fit with active hiring signals; discovery call to validate migration timeline",
}

const validValueEngineering = {
  revenue_impact: {
    performance_improvement_potential: {
      current_lcp_ms: 4200,
      projected_lcp_ms: 1800,
      lcp_improvement_pct: 57,
      current_ttfb_ms: 1200,
      projected_ttfb_ms: 50,
      ttfb_improvement_pct: 96,
    },
    conversion_rate_impact: {
      methodology: "Deloitte milliseconds study",
      estimated_conversion_lift_pct: 8.4,
      rationale:
        "2.4s LCP improvement maps to estimated 8.4% conversion lift",
    },
    qualitative_revenue_drivers: [
      "Improved Core Web Vitals for SEO ranking",
      "Better mobile experience",
    ],
  },
  tco_comparison: {
    current_stack_estimate: {
      hosting_monthly: "$2,500",
      cdn_monthly: "$800",
      ci_cd_monthly: "$400",
      monitoring_monthly: "$300",
      developer_infra_time_pct: 30,
      total_monthly_estimate: "$4,000",
      assumptions:
        "Based on typical AWS ECS + CloudFront setup for mid-market e-commerce",
    },
    vercel_estimate: {
      plan_recommendation: "Enterprise",
      estimated_monthly: "$3,000",
      includes: [
        "Hosting",
        "Edge Network",
        "CI/CD",
        "Analytics",
        "Firewall",
      ],
      developer_infra_time_pct: 5,
    },
    savings_narrative:
      "Net $1,000/mo savings plus 25% developer time freed from infrastructure work",
  },
  migration: {
    complexity: "medium",
    estimated_effort: "6-8 person-weeks",
    approach: "incremental-migration",
    approach_rationale:
      "Existing Next.js app can be incrementally migrated route-by-route",
    migration_steps: [
      {
        step: 1,
        title: "Deploy existing app to Vercel",
        description: "Connect repo and deploy current Next.js app as-is",
        effort: "1 day",
        risk_level: "low",
      },
    ],
    risks: [
      {
        risk: "Custom server middleware incompatible with Edge Runtime",
        mitigation: "Audit middleware and convert to Edge-compatible functions",
        severity: "medium",
      },
    ],
  },
  vercel_features: [
    {
      feature: "Edge Functions",
      relevance_to_prospect: "Replace custom middleware with zero-config edge",
      priority: "critical",
      category: "performance",
    },
  ],
  competitor_displacement: {
    current_provider: "AWS (ECS + CloudFront)",
    provider_category: "cloud-hosting",
    switching_cost: "medium",
    key_differentiators: [
      "Zero-config deployments",
      "Built-in edge network",
      "Preview deployments",
    ],
    common_objections: [
      {
        objection: "We need full infrastructure control",
        response:
          "Vercel Enterprise offers custom build pipelines and advanced configuration",
      },
    ],
  },
  talking_points: [
    {
      point: "57% LCP improvement projected based on current architecture",
      audience: "engineering",
      supporting_data:
        "Current LCP 4.2s vs projected 1.8s on Vercel Edge Network",
    },
  ],
  closest_case_study: {
    company: "Washington Post",
    similarity_rationale:
      "Similar content-heavy site that migrated from custom infrastructure",
    key_outcomes: ["70% faster page loads", "40% reduction in infra costs"],
    reference_url: "https://vercel.com/customers/washington-post",
  },
}

const validArchitecture = {
  current_architecture: {
    mermaid_diagram:
      "graph TD\n  Browser-->CloudFront\n  CloudFront-->ECS\n  ECS-->RDS",
    description:
      "Traditional three-tier architecture with CloudFront CDN, ECS containers, and RDS database",
    pain_points: [
      "Manual scaling configuration",
      "Slow deployment pipeline",
      "No preview environments",
    ],
  },
  target_architecture: {
    mermaid_diagram:
      "graph TD\n  Browser-->Vercel\n  Vercel-->API[API Routes]\n  API-->RDS",
    description:
      "Vercel-powered architecture with edge rendering and serverless API routes",
    key_changes: [
      {
        component: "CDN / Hosting",
        from: "CloudFront + ECS",
        to: "Vercel Edge Network",
        benefit: "Automatic global distribution with zero configuration",
      },
    ],
  },
  poc_proposal: {
    title: "Homepage & PLP Migration POC",
    scope:
      "Migrate homepage and one product listing page to Vercel; out of scope: checkout flow",
    approach:
      "Deploy existing Next.js app to Vercel, optimise critical pages with ISR",
    duration: "2 weeks",
    success_criteria: [
      {
        metric: "LCP",
        current_value: "4.2s",
        target_value: "< 2.5s",
      },
    ],
    required_from_prospect: [
      "Repository access",
      "Staging environment credentials",
    ],
    vercel_resources: ["Solutions Architect (4 hours)", "Enterprise trial"],
    risk_mitigation:
      "Isolated deployment with no impact on production traffic; feature-flagged rollout",
  },
}

// ---------------------------------------------------------------------------
// TechStackSchema
// ---------------------------------------------------------------------------
describe("TechStackSchema", () => {
  it("parses a valid full object", () => {
    expect(() => TechStackSchema.parse(validTechStack)).not.toThrow()
  })

  it("parses with optional fields omitted", () => {
    const minimal = { ...validTechStack }
    // Remove all optional detectedTech fields
    delete (minimal as Record<string, unknown>).cms
    delete (minimal as Record<string, unknown>).commerce
    delete (minimal as Record<string, unknown>).search
    delete (minimal as Record<string, unknown>).media_dam
    delete (minimal as Record<string, unknown>).ab_testing
    delete (minimal as Record<string, unknown>).personalization
    delete (minimal as Record<string, unknown>).auth
    delete (minimal as Record<string, unknown>).payments
    delete (minimal as Record<string, unknown>).monitoring
    delete (minimal as Record<string, unknown>).api_patterns

    expect(() => TechStackSchema.parse(minimal)).not.toThrow()
  })

  it("rejects an invalid confidence enum value", () => {
    const invalid = {
      ...validTechStack,
      frontend_framework: {
        ...validTechStack.frontend_framework,
        confidence: "super-high",
      },
    }
    expect(() => TechStackSchema.parse(invalid)).toThrow()
  })

  it("rejects an invalid composable_maturity value", () => {
    const invalid = {
      ...validTechStack,
      composable_maturity: "semi-composable",
    }
    expect(() => TechStackSchema.parse(invalid)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// QualificationSchema
// ---------------------------------------------------------------------------
describe("QualificationSchema", () => {
  it("parses a valid full object", () => {
    expect(() => QualificationSchema.parse(validQualification)).not.toThrow()
  })

  it("validates deal_score is a number", () => {
    const invalid = { ...validQualification, deal_score: "high" }
    expect(() => QualificationSchema.parse(invalid)).toThrow()
  })

  it("validates traffic_tier enum", () => {
    const invalid = { ...validQualification, traffic_tier: "mega-corp" }
    expect(() => QualificationSchema.parse(invalid)).toThrow()
  })

  it("validates recommended_action enum", () => {
    const invalid = {
      ...validQualification,
      recommended_action: "send-swag",
    }
    expect(() => QualificationSchema.parse(invalid)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// ValueEngineeringSchema
// ---------------------------------------------------------------------------
describe("ValueEngineeringSchema", () => {
  it("parses a valid full object", () => {
    expect(() =>
      ValueEngineeringSchema.parse(validValueEngineering)
    ).not.toThrow()
  })

  it("validates migration.complexity enum", () => {
    const invalid = {
      ...validValueEngineering,
      migration: {
        ...validValueEngineering.migration,
        complexity: "impossible",
      },
    }
    expect(() => ValueEngineeringSchema.parse(invalid)).toThrow()
  })

  it("validates migration_steps is an array of correctly shaped objects", () => {
    const invalid = {
      ...validValueEngineering,
      migration: {
        ...validValueEngineering.migration,
        migration_steps: [{ wrong_key: "bad" }],
      },
    }
    expect(() => ValueEngineeringSchema.parse(invalid)).toThrow()
  })

  it("validates risks is an array of correctly shaped objects", () => {
    const invalid = {
      ...validValueEngineering,
      migration: {
        ...validValueEngineering.migration,
        risks: [{ not_a_risk: true }],
      },
    }
    expect(() => ValueEngineeringSchema.parse(invalid)).toThrow()
  })

  it("validates talking_points is an array of correctly shaped objects", () => {
    const invalid = {
      ...validValueEngineering,
      talking_points: [{ random_field: "nope" }],
    }
    expect(() => ValueEngineeringSchema.parse(invalid)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// ArchitectureSchema
// ---------------------------------------------------------------------------
describe("ArchitectureSchema", () => {
  it("parses a valid full object", () => {
    expect(() => ArchitectureSchema.parse(validArchitecture)).not.toThrow()
  })

  it("validates poc_proposal structure", () => {
    const invalid = {
      ...validArchitecture,
      poc_proposal: {
        title: "POC",
        // missing required fields: scope, approach, duration, etc.
      },
    }
    expect(() => ArchitectureSchema.parse(invalid)).toThrow()
  })

  it("validates key_changes array contains correctly shaped objects", () => {
    const invalid = {
      ...validArchitecture,
      target_architecture: {
        ...validArchitecture.target_architecture,
        key_changes: [{ invalid_key: "bad" }],
      },
    }
    expect(() => ArchitectureSchema.parse(invalid)).toThrow()
  })
})
