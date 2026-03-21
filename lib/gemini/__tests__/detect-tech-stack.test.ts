import { vi } from 'vitest';
import type { TechStack } from '@/lib/schemas';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-model'),
}));

import { generateObject } from 'ai';
import { detectTechStack } from '../detect-tech-stack';

const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validTechStack: TechStack = {
  frontend_framework: {
    name: 'Next.js',
    version: '14.1.0',
    confidence: 'high',
    evidence: 'Detected /_next/ asset paths and __NEXT_DATA__ script tag.',
    is_nextjs: true,
    nextjs_version: '14',
    uses_app_router: true,
    is_self_hosted: true,
  },
  rendering_analysis: {
    primary_strategy: 'SSR',
    has_hydration_issues: false,
    has_stale_while_revalidate: false,
    client_side_data_fetching: false,
    evidence: 'Full server-rendered HTML with React hydration scripts.',
  },
  hosting: {
    name: 'AWS',
    confidence: 'high',
    evidence: 'x-amz-cf-id header present.',
    is_vercel: false,
    estimated_infra_complexity: 'moderate',
  },
  cdn: {
    name: 'CloudFront',
    confidence: 'high',
    evidence: 'x-amz-cf-pop header present.',
  },
  analytics: [
    { name: 'Google Analytics 4', evidence: 'gtag.js script detected.' },
  ],
  third_party_scripts: [
    {
      name: 'Google Tag Manager',
      purpose: 'Tag management',
      url_pattern: 'googletagmanager.com/gtm.js',
      estimated_impact: 'medium',
    },
  ],
  composable_maturity: 'partially-decoupled',
  meta_framework_signals: ['Webpack chunks detected'],
};

const sampleHeaders: Record<string, string> = {
  'content-type': 'text/html; charset=utf-8',
  'x-amz-cf-id': 'abc123',
  server: 'nginx',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectTechStack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a TechStack object from the Gemini response', async () => {
    mockGenerateObject.mockResolvedValue({ object: validTechStack });

    const result = await detectTechStack('<html></html>', sampleHeaders, 'example.com');

    expect(result).toEqual(validTechStack);
    expect(mockGenerateObject).toHaveBeenCalledOnce();
  });

  it('truncates HTML to 60 000 characters before passing to Gemini', async () => {
    mockGenerateObject.mockResolvedValue({ object: validTechStack });

    const longHtml = 'a'.repeat(100_000);
    await detectTechStack(longHtml, sampleHeaders, 'example.com');

    const callArgs = mockGenerateObject.mock.calls[0][0];
    // The prompt should contain only the first 60 000 chars of the HTML
    expect(callArgs.prompt).toContain('a'.repeat(60_000));
    expect(callArgs.prompt).not.toContain('a'.repeat(60_001));
  });

  it('passes headers as JSON in the prompt', async () => {
    mockGenerateObject.mockResolvedValue({ object: validTechStack });

    await detectTechStack('<html></html>', sampleHeaders, 'example.com');

    const callArgs = mockGenerateObject.mock.calls[0][0];
    expect(callArgs.prompt).toContain(JSON.stringify(sampleHeaders, null, 2));
  });

  it('returns a degraded result when Gemini throws', async () => {
    mockGenerateObject.mockRejectedValue(new Error('API quota exceeded'));

    const result = await detectTechStack('<html></html>', sampleHeaders, 'example.com');

    expect(result.frontend_framework.name).toBe('detection-failed');
    expect(result.frontend_framework.confidence).toBe('low');
    expect(result.hosting.name).toBe('detection-failed');
    expect(result.hosting.is_vercel).toBe(false);
    expect(result.composable_maturity).toBe('monolithic');
    expect(result.analytics).toEqual([]);
    expect(result.third_party_scripts).toEqual([]);
  });

  it('includes the error message in the degraded result evidence', async () => {
    mockGenerateObject.mockRejectedValue(new Error('API quota exceeded'));

    const result = await detectTechStack('<html></html>', sampleHeaders, 'example.com');

    expect(result.frontend_framework.evidence).toContain('API quota exceeded');
    expect(result.rendering_analysis.evidence).toContain('API quota exceeded');
    expect(result.hosting.evidence).toContain('API quota exceeded');
  });
});
