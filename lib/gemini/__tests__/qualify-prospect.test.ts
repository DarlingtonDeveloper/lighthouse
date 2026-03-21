import { vi } from 'vitest';
import type { TechStack, Qualification } from '@/lib/schemas';
import type { PerformanceMetrics } from '@/lib/pagespeed';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-model'),
}));

import { generateObject } from 'ai';
import { qualifyProspect } from '../qualify-prospect';

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
    hiring_signals: ['Senior Frontend Engineer', 'Staff Platform Engineer'],
    mentions_headless: true,
    recent_replatform: false,
    evidence: 'Job postings mention Next.js and headless commerce.',
  },
  vercel_fit: {
    score: 'strong',
    rationale: 'Self-hosted Next.js on AWS with poor performance metrics.',
    already_on_vercel: false,
    blockers: ['Complex CI/CD pipeline'],
    accelerators: ['Already using Next.js', 'Poor TTFB on current infra'],
  },
  company_profile: {
    estimated_size: 'mid-market',
    industry_vertical: 'e-commerce',
    b2b_or_b2c: 'B2C',
  },
  recommended_action: 'schedule-discovery-call',
  action_rationale: 'Strong Vercel fit with migration signals from hiring data.',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('qualifyProspect', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: careers page fetch returns 404 so scrapeCareersPage returns ""
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns a Qualification object from the Gemini response', async () => {
    mockGenerateObject.mockResolvedValue({ object: validQualification });

    const result = await qualifyProspect('example.com', validTechStack, validPerformance);

    expect(result).toEqual(validQualification);
    expect(mockGenerateObject).toHaveBeenCalledOnce();
  });

  it('attempts to scrape the careers page at multiple URL patterns', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({ ok: false, status: 404, text: async () => '' });
    mockGenerateObject.mockResolvedValue({ object: validQualification });

    await qualifyProspect('example.com', validTechStack, validPerformance);

    const fetchedUrls = mockFetch.mock.calls.map((c: unknown[]) => c[0]);
    expect(fetchedUrls).toContain('https://example.com/careers');
    expect(fetchedUrls).toContain('https://example.com/jobs');
    expect(fetchedUrls).toContain('https://careers.example.com');
    expect(fetchedUrls).toContain('https://example.com/about/careers');
  });

  it('includes tech stack and performance data in the prompt', async () => {
    mockGenerateObject.mockResolvedValue({ object: validQualification });

    await qualifyProspect('example.com', validTechStack, validPerformance);

    const callArgs = mockGenerateObject.mock.calls[0][0];
    expect(callArgs.prompt).toContain(JSON.stringify(validTechStack, null, 2));
    expect(callArgs.prompt).toContain(JSON.stringify(validPerformance, null, 2));
  });

  it('returns a default low-score qualification when Gemini throws', async () => {
    mockGenerateObject.mockRejectedValue(new Error('Service unavailable'));

    const result = await qualifyProspect('example.com', validTechStack, validPerformance);

    expect(result.deal_score).toBe(0);
    expect(result.recommended_action).toBe('deprioritise');
    expect(result.traffic_tier).toBe('unknown');
    expect(result.vercel_fit.score).toBe('weak');
    expect(result.vercel_fit.already_on_vercel).toBe(false);
  });

  it('handles careers page fetch failure gracefully and still calls Gemini', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new Error('Network error'));
    mockGenerateObject.mockResolvedValue({ object: validQualification });

    const result = await qualifyProspect('example.com', validTechStack, validPerformance);

    expect(result).toEqual(validQualification);
    expect(mockGenerateObject).toHaveBeenCalledOnce();

    // The prompt should indicate no careers content was found
    const callArgs = mockGenerateObject.mock.calls[0][0];
    expect(callArgs.prompt).toContain('(No careers page content found)');
  });
});
