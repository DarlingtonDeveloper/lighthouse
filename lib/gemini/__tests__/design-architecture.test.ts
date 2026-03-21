import { vi } from 'vitest';
import type { TechStack, ValueEngineering, Architecture } from '@/lib/schemas';
import type { PerformanceMetrics } from '@/lib/pagespeed';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-model'),
}));

import { generateObject } from 'ai';
import { designArchitecture } from '../design-architecture';

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
      methodology: 'Google/Deloitte study.',
      estimated_conversion_lift_pct: 5.6,
      rationale: 'LCP improvement projected to lift conversions.',
    },
    qualitative_revenue_drivers: ['Better SEO from improved CWV.'],
  },
  tco_comparison: {
    current_stack_estimate: {
      hosting_monthly: '$800',
      cdn_monthly: '$300',
      ci_cd_monthly: '$100',
      monitoring_monthly: '$200',
      developer_infra_time_pct: 25,
      total_monthly_estimate: '$1,400',
      assumptions: 'Based on typical AWS ECS + CloudFront setup.',
    },
    vercel_estimate: {
      plan_recommendation: 'Enterprise',
      estimated_monthly: '$3,000-$5,000',
      includes: ['Edge Network', 'Image Optimization'],
      developer_infra_time_pct: 5,
    },
    savings_narrative: 'Net savings from developer time reclamation.',
  },
  migration: {
    complexity: 'low',
    estimated_effort: '1-2 sprints',
    approach: 'direct-deploy',
    approach_rationale: 'Already Next.js.',
    migration_steps: [
      {
        step: 1,
        title: 'Connect repo',
        description: 'Link repo to Vercel.',
        effort: '1 day',
        risk_level: 'low',
      },
    ],
    risks: [],
  },
  vercel_features: [],
  competitor_displacement: {
    current_provider: 'AWS',
    provider_category: 'cloud-hosting',
    switching_cost: 'low',
    key_differentiators: ['Framework-native optimisation'],
    common_objections: [],
  },
  talking_points: [],
  closest_case_study: {
    company: 'Sonos',
    similarity_rationale: 'Similar DTC migration.',
    key_outcomes: ['40% faster page loads.'],
  },
};

const validArchitecture: Architecture = {
  current_architecture: {
    mermaid_diagram:
      'graph TD\n  User[User] --> CDN[CloudFront CDN]\n  CDN --> Origin[AWS ECS]\n  Origin --> App[Next.js SSR]',
    description: 'Next.js SSR application hosted on AWS ECS behind CloudFront CDN.',
    pain_points: [
      'High TTFB due to single-region origin.',
      'Manual CDN cache invalidation.',
    ],
  },
  target_architecture: {
    mermaid_diagram:
      'graph TD\n  User[User] --> Edge[Vercel Edge Network]\n  Edge --> NextJS[Next.js on Vercel]\n  NextJS --> Backend[Existing AWS APIs]',
    description:
      'Next.js deployed on Vercel with global edge delivery and automatic optimisations.',
    key_changes: [
      {
        component: 'Frontend Delivery',
        from: 'AWS ECS + CloudFront',
        to: 'Vercel Edge Network',
        benefit: 'Sub-50ms TTFB globally with zero infrastructure management.',
      },
    ],
  },
  poc_proposal: {
    title: 'example.com - Vercel PoC: Homepage Migration',
    scope: 'Migrate homepage to Next.js on Vercel using Edge Middleware reverse proxy.',
    approach:
      'Deploy Next.js on Vercel for the homepage. Reverse-proxy all other routes to existing AWS origin.',
    duration: '1-2 weeks',
    success_criteria: [
      {
        metric: 'TTFB',
        current_value: '650ms',
        target_value: '< 100ms',
      },
      {
        metric: 'LCP',
        current_value: '2800ms',
        target_value: '< 1680ms (40%+ improvement)',
      },
    ],
    required_from_prospect: [
      'Source code repository access',
      'Environment variables',
      'DNS management access',
    ],
    vercel_resources: [
      'Solutions Architect time',
      'Enterprise trial account',
    ],
    risk_mitigation:
      'Edge Middleware reverse proxy ensures zero disruption. Rollback is instant via DNS change.',
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('designArchitecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an Architecture object from the Gemini response', async () => {
    mockGenerateObject.mockResolvedValue({ object: validArchitecture });

    const result = await designArchitecture(
      'example.com',
      validTechStack,
      validPerformance,
      validValueEngineering,
    );

    expect(result).toEqual(validArchitecture);
    expect(mockGenerateObject).toHaveBeenCalledOnce();
  });

  it('passes techStack, performance, and valueEngineering in the prompt', async () => {
    mockGenerateObject.mockResolvedValue({ object: validArchitecture });

    await designArchitecture(
      'example.com',
      validTechStack,
      validPerformance,
      validValueEngineering,
    );

    const callArgs = mockGenerateObject.mock.calls[0][0];
    expect(callArgs.prompt).toContain(JSON.stringify(validTechStack, null, 2));
    expect(callArgs.prompt).toContain(JSON.stringify(validPerformance, null, 2));
    expect(callArgs.prompt).toContain(JSON.stringify(validValueEngineering, null, 2));
  });

  it('returns a degraded result with basic mermaid diagrams when Gemini throws', async () => {
    mockGenerateObject.mockRejectedValue(new Error('Model overloaded'));

    const result = await designArchitecture(
      'example.com',
      validTechStack,
      validPerformance,
      validValueEngineering,
    );

    // Current architecture should have a basic diagram with hosting name
    expect(result.current_architecture.mermaid_diagram).toContain('graph TD');
    expect(result.current_architecture.mermaid_diagram).toContain('AWS');
    expect(result.current_architecture.pain_points.length).toBeGreaterThan(0);

    // Target architecture should have a basic Vercel diagram
    expect(result.target_architecture.mermaid_diagram).toContain('graph TD');
    expect(result.target_architecture.mermaid_diagram).toContain('Vercel Edge Network');
    expect(result.target_architecture.key_changes.length).toBeGreaterThan(0);
  });

  it('includes a generic PoC proposal in the degraded result', async () => {
    mockGenerateObject.mockRejectedValue(new Error('Model overloaded'));

    const result = await designArchitecture(
      'example.com',
      validTechStack,
      validPerformance,
      validValueEngineering,
    );

    expect(result.poc_proposal.title).toContain('example.com');
    expect(result.poc_proposal.scope).toBeTruthy();
    expect(result.poc_proposal.approach).toBeTruthy();
    expect(result.poc_proposal.duration).toBeTruthy();
    expect(result.poc_proposal.success_criteria.length).toBeGreaterThan(0);
    expect(result.poc_proposal.required_from_prospect.length).toBeGreaterThan(0);
    expect(result.poc_proposal.vercel_resources.length).toBeGreaterThan(0);
    expect(result.poc_proposal.risk_mitigation).toBeTruthy();
  });
});
