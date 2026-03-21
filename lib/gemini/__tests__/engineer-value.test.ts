import { vi } from 'vitest';
import type { TechStack, Qualification, ValueEngineering } from '@/lib/schemas';
import type { PerformanceMetrics } from '@/lib/pagespeed';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-model'),
}));

import { generateObject } from 'ai';
import { engineerValue } from '../engineer-value';

const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validTechStack: TechStack = {
  frontend_framework: {
    name: 'Next.js',
    confidence: 'high',
    evidence: '/_next/ paths detected.',
    is_nextjs: true,
    is_self_hosted: true,
  },
  rendering_analysis: {
    primary_strategy: 'SSR',
    has_hydration_issues: false,
    has_stale_while_revalidate: false,
    client_side_data_fetching: false,
    evidence: 'Server-rendered HTML.',
  },
  hosting: {
    name: 'AWS',
    confidence: 'high',
    evidence: 'x-amz-cf-id header.',
    is_vercel: false,
    estimated_infra_complexity: 'moderate',
  },
  cdn: {
    name: 'CloudFront',
    confidence: 'high',
    evidence: 'x-amz-cf-pop header.',
  },
  analytics: [],
  third_party_scripts: [],
  composable_maturity: 'partially-decoupled',
  meta_framework_signals: [],
};

const validPerformance: PerformanceMetrics = {
  lcp_ms: 2800,
  fid_ms: 120,
  cls: 0.05,
  fcp_ms: 1200,
  ttfb_ms: 650,
  tbt_ms: 300,
  inp_ms: 180,
  speed_index_ms: 3200,
  performance_score: 62,
  crux_lcp_p75: 3100,
  crux_inp_p75: 200,
  crux_cls_p75: 0.08,
  crux_ttfb_p75: 700,
  has_crux_data: true,
  crux_origin_data: false,
  screenshot_base64: null,
  cwv_assessment: 'needs-improvement',
};

const validQualification: Qualification = {
  deal_score: 72,
  traffic_tier: 'enterprise',
  migration_signals: {
    hiring_frontend: true,
    hiring_signals: ['Senior Frontend Engineer'],
    mentions_headless: true,
    recent_replatform: false,
    evidence: 'Job postings mention Next.js.',
  },
  vercel_fit: {
    score: 'strong',
    rationale: 'Self-hosted Next.js on AWS.',
    already_on_vercel: false,
    blockers: [],
    accelerators: ['Already using Next.js'],
  },
  company_profile: {
    estimated_size: 'mid-market',
    industry_vertical: 'e-commerce',
    b2b_or_b2c: 'B2C',
  },
  recommended_action: 'schedule-discovery-call',
  action_rationale: 'Strong Vercel fit.',
};

const validValueEngineering: ValueEngineering = {
  revenue_impact: {
    performance_improvement_potential: {
      current_lcp_ms: 2800,
      projected_lcp_ms: 1400,
      lcp_improvement_pct: 50,
      current_ttfb_ms: 650,
      projected_ttfb_ms: 50,
      ttfb_improvement_pct: 92,
    },
    conversion_rate_impact: {
      methodology: 'Google/Deloitte Milliseconds Make Millions study.',
      estimated_conversion_lift_pct: 5.6,
      rationale: '1400ms LCP improvement projected to lift conversions by ~5.6%.',
    },
    qualitative_revenue_drivers: [
      'Improved SEO from better Core Web Vitals.',
      'Reduced bounce rate from faster page loads.',
    ],
  },
  tco_comparison: {
    current_stack_estimate: {
      hosting_monthly: '$800',
      cdn_monthly: '$300',
      ci_cd_monthly: '$100',
      monitoring_monthly: '$200',
      developer_infra_time_pct: 25,
      total_monthly_estimate: '$1,400',
      assumptions: 'Based on typical AWS ECS + CloudFront setup for mid-market traffic.',
    },
    vercel_estimate: {
      plan_recommendation: 'Enterprise',
      estimated_monthly: '$3,000-$5,000',
      includes: [
        'Edge Network',
        'Image Optimization',
        'Analytics',
        'Enterprise SLA',
      ],
      developer_infra_time_pct: 5,
    },
    savings_narrative: 'Net savings driven primarily by developer time reclamation.',
  },
  migration: {
    complexity: 'low',
    estimated_effort: '1-2 sprints',
    approach: 'direct-deploy',
    approach_rationale: 'Already Next.js -- connect repo and deploy.',
    migration_steps: [
      {
        step: 1,
        title: 'Connect Git repository',
        description: 'Link the existing repo to Vercel.',
        effort: '1 day',
        risk_level: 'low',
      },
    ],
    risks: [
      {
        risk: 'Environment variable mismatch',
        mitigation: 'Audit env vars before cutover.',
        severity: 'low',
      },
    ],
  },
  vercel_features: [
    {
      feature: 'Edge Functions',
      relevance_to_prospect: 'Replace CloudFront functions for geo-routing.',
      priority: 'high',
      category: 'performance',
    },
  ],
  competitor_displacement: {
    current_provider: 'AWS',
    provider_category: 'cloud-hosting',
    switching_cost: 'low',
    key_differentiators: ['Framework-native optimisation', 'Zero-config CI/CD'],
    common_objections: [
      {
        objection: 'We already have AWS expertise.',
        response: 'Vercel removes the need for that expertise on the frontend layer.',
      },
    ],
  },
  talking_points: [
    {
      point: 'Preview deployments per PR eliminate staging bottlenecks.',
      audience: 'engineering',
      supporting_data: 'Forrester TEI: 4x more feature releases per quarter.',
    },
  ],
  closest_case_study: {
    company: 'Sonos',
    similarity_rationale: 'Similar e-commerce DTC migration from self-hosted Next.js.',
    key_outcomes: [
      'Improved global page load times by 40%.',
      'Reduced infrastructure management burden.',
    ],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('engineerValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a ValueEngineering object from the Gemini response', async () => {
    mockGenerateObject.mockResolvedValue({ object: validValueEngineering });

    const result = await engineerValue(
      'example.com',
      validTechStack,
      validPerformance,
      validQualification,
      '',
    );

    expect(result).toEqual(validValueEngineering);
    expect(mockGenerateObject).toHaveBeenCalledOnce();
  });

  it('includes prior patterns in the system prompt', async () => {
    mockGenerateObject.mockResolvedValue({ object: validValueEngineering });

    const priorPatterns = 'Similar prospects migrated in 2 sprints with zero downtime.';
    await engineerValue(
      'example.com',
      validTechStack,
      validPerformance,
      validQualification,
      priorPatterns,
    );

    const callArgs = mockGenerateObject.mock.calls[0][0];
    expect(callArgs.system).toContain(priorPatterns);
  });

  it('passes techStack, performance, and qualification in the prompt', async () => {
    mockGenerateObject.mockResolvedValue({ object: validValueEngineering });

    await engineerValue(
      'example.com',
      validTechStack,
      validPerformance,
      validQualification,
      '',
    );

    const callArgs = mockGenerateObject.mock.calls[0][0];
    expect(callArgs.prompt).toContain(JSON.stringify(validTechStack, null, 2));
    expect(callArgs.prompt).toContain(JSON.stringify(validPerformance, null, 2));
    expect(callArgs.prompt).toContain(JSON.stringify(validQualification, null, 2));
  });

  it('returns a degraded result when Gemini throws', async () => {
    mockGenerateObject.mockRejectedValue(new Error('Rate limit exceeded'));

    const result = await engineerValue(
      'example.com',
      validTechStack,
      validPerformance,
      validQualification,
      '',
    );

    // Revenue impact should use fallback values
    expect(result.revenue_impact.conversion_rate_impact.estimated_conversion_lift_pct).toBe(0);
    expect(result.revenue_impact.qualitative_revenue_drivers).toEqual([]);

    // TCO should have placeholder values
    expect(result.tco_comparison.current_stack_estimate.total_monthly_estimate).toBe('Unknown');
    expect(result.tco_comparison.vercel_estimate.includes).toEqual([]);

    // Migration should have empty steps and risks
    expect(result.migration.migration_steps).toEqual([]);
    expect(result.migration.risks).toEqual([]);

    // Features and talking points should be empty arrays
    expect(result.vercel_features).toEqual([]);
    expect(result.talking_points).toEqual([]);

    // Case study should have placeholder values
    expect(result.closest_case_study.company).toBe('Unable to determine');
    expect(result.closest_case_study.key_outcomes).toEqual([]);
  });
});
