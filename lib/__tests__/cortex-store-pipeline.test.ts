import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/cortex', () => ({
  cortexStore: vi.fn().mockResolvedValue({ ok: true }),
}))

import { cortexStore } from '@/lib/cortex'
import { storeInCortex } from '../cortex-store-pipeline'

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const mockData = {
  techStack: {
    frontend_framework: { name: 'Next.js', is_nextjs: true },
    hosting: { name: 'AWS', is_vercel: false },
    cdn: { name: 'CloudFront' },
    composable_maturity: 'partially-decoupled',
    cms: { name: 'Contentful' },
    commerce: null,
  },
  performance: {
    performance_score: 65,
    lcp_ms: 3200,
    ttfb_ms: 800,
    cls: 0.12,
    has_crux_data: true,
    cwv_assessment: 'needs-improvement',
  },
  qualification: {
    deal_score: 72,
    traffic_tier: 'mid-market',
    recommended_action: 'schedule-discovery-call',
    vercel_fit: { score: 'strong' },
    company_profile: { industry_vertical: 'e-commerce' },
  },
  valueEngineering: {
    migration: {
      approach: 'direct-deploy',
      complexity: 'low',
      migration_steps: [
        { step: 1, title: 'Setup', description: 'Configure project', effort: '1 day', risk_level: 'low' },
        { step: 2, title: 'Deploy', description: 'Deploy to Vercel', effort: '1 day', risk_level: 'low' },
      ],
    },
    competitor_displacement: { current_provider: 'AWS' },
    closest_case_study: { company: 'Sonos', similarity_rationale: 'Similar stack' },
  },
  architecture: {
    poc_proposal: { title: 'Homepage PoC', duration: '2 weeks', scope: 'Homepage migration' },
  },
}

const TEST_DOMAIN = 'example.com'
const TEST_URL = 'https://example.com'
const ENTITY_TAG = 'entity-example-com'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedCortexStore = cortexStore as ReturnType<typeof vi.fn>

function getCallArgs(): Array<Record<string, unknown>> {
  return mockedCortexStore.mock.calls.map(
    (call: unknown[]) => call[0] as Record<string, unknown>,
  )
}

function findCallByKind(kind: string): Record<string, unknown> | undefined {
  return getCallArgs().find((arg) => arg.kind === kind)
}

function findAllCallsByKind(kind: string): Array<Record<string, unknown>> {
  return getCallArgs().filter((arg) => arg.kind === kind)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('storeInCortex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCortexStore.mockResolvedValue({ ok: true })
  })

  // -----------------------------------------------------------------------
  // Calls cortexStore for each node type
  // -----------------------------------------------------------------------

  it('calls cortexStore for each node type', async () => {
    await storeInCortex(TEST_DOMAIN, TEST_URL, mockData)

    const args = getCallArgs()
    const kinds = args.map((a) => a.kind)

    expect(kinds).toContain('prospect')
    expect(kinds).toContain('stack-detection')
    expect(kinds).toContain('performance-snapshot')
    expect(kinds).toContain('qualification-score')
    expect(kinds).toContain('value-proposition')
    expect(kinds).toContain('poc-scope')
    expect(kinds).toContain('case-study-match')
    expect(kinds).toContain('migration-pattern')
  })

  // -----------------------------------------------------------------------
  // Total call count = 7 fixed + migration steps
  // -----------------------------------------------------------------------

  it('total cortexStore calls = 7 fixed + number of migration steps', async () => {
    await storeInCortex(TEST_DOMAIN, TEST_URL, mockData)

    const migrationStepCount = mockData.valueEngineering.migration.migration_steps.length
    const expectedTotal = 7 + migrationStepCount

    expect(mockedCortexStore).toHaveBeenCalledTimes(expectedTotal)
  })

  // -----------------------------------------------------------------------
  // Correct kind for each node
  // -----------------------------------------------------------------------

  it('sets correct kind for each node', async () => {
    await storeInCortex(TEST_DOMAIN, TEST_URL, mockData)

    const args = getCallArgs()
    const kinds = args.map((a) => a.kind)

    const expectedKinds = [
      'prospect',
      'stack-detection',
      'performance-snapshot',
      'qualification-score',
      'value-proposition',
      'poc-scope',
      'case-study-match',
      'migration-pattern',
      'migration-pattern',
    ]

    expect(kinds).toEqual(expectedKinds)
  })

  // -----------------------------------------------------------------------
  // Correct importance for each node
  // -----------------------------------------------------------------------

  it('sets correct importance for each node', async () => {
    await storeInCortex(TEST_DOMAIN, TEST_URL, mockData)

    const prospectCall = findCallByKind('prospect')
    expect(prospectCall?.importance).toBe(0.8)

    const stackCall = findCallByKind('stack-detection')
    expect(stackCall?.importance).toBe(0.8)

    const perfCall = findCallByKind('performance-snapshot')
    expect(perfCall?.importance).toBe(0.7)

    const qualCall = findCallByKind('qualification-score')
    expect(qualCall?.importance).toBe(0.85)

    const valueCall = findCallByKind('value-proposition')
    expect(valueCall?.importance).toBe(0.9)

    const pocCall = findCallByKind('poc-scope')
    expect(pocCall?.importance).toBe(0.85)

    const caseStudyCall = findCallByKind('case-study-match')
    expect(caseStudyCall?.importance).toBe(0.6)

    const migrationCalls = findAllCallsByKind('migration-pattern')
    for (const call of migrationCalls) {
      expect(call.importance).toBe(0.5)
    }
  })

  // -----------------------------------------------------------------------
  // entityTag included in tags for all nodes
  // -----------------------------------------------------------------------

  it('includes entityTag in tags for all nodes', async () => {
    await storeInCortex(TEST_DOMAIN, TEST_URL, mockData)

    const allCalls = getCallArgs()

    for (const call of allCalls) {
      const tags = call.tags as string[]
      expect(tags).toContain(ENTITY_TAG)
    }
  })

  // -----------------------------------------------------------------------
  // Does not throw when cortexStore fails for some nodes
  // -----------------------------------------------------------------------

  it('does not throw when cortexStore fails for some nodes', async () => {
    let callIndex = 0
    mockedCortexStore.mockImplementation(async () => {
      callIndex++
      // Fail every other call
      if (callIndex % 2 === 0) {
        throw new Error('Cortex write failed')
      }
      return { ok: true }
    })

    await expect(
      storeInCortex(TEST_DOMAIN, TEST_URL, mockData),
    ).resolves.not.toThrow()
  })

  // -----------------------------------------------------------------------
  // Does not throw when data has missing/null fields
  // -----------------------------------------------------------------------

  it('does not throw when data has missing/null fields', async () => {
    const sparseData = {
      techStack: {
        frontend_framework: null,
        hosting: null,
        cdn: null,
        composable_maturity: null,
        cms: null,
        commerce: null,
      },
      performance: {
        performance_score: null,
        lcp_ms: null,
        ttfb_ms: null,
        cls: null,
        has_crux_data: false,
        cwv_assessment: null,
      },
      qualification: {
        deal_score: null,
        traffic_tier: null,
        recommended_action: null,
        vercel_fit: null,
        company_profile: null,
      },
      valueEngineering: {
        migration: null,
        competitor_displacement: null,
        closest_case_study: null,
      },
      architecture: {
        poc_proposal: null,
      },
    }

    await expect(
      storeInCortex(TEST_DOMAIN, TEST_URL, sparseData),
    ).resolves.not.toThrow()
  })

  // -----------------------------------------------------------------------
  // Logs warning on partial failures
  // -----------------------------------------------------------------------

  it('logs warning on partial failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let callIndex = 0
    mockedCortexStore.mockImplementation(async () => {
      callIndex++
      if (callIndex === 1) {
        throw new Error('Cortex write failed')
      }
      return { ok: true }
    })

    await storeInCortex(TEST_DOMAIN, TEST_URL, mockData)

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed'),
    )

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
