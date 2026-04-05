/**
 * runner.ts
 * ----------
 * Evaluation runner that tests detectTechStack accuracy against
 * a hand-curated ground truth set.
 *
 * Measures:
 * - Per-field accuracy (is the answer correct?)
 * - Confidence calibration (does confidence predict accuracy?)
 * - Schema pass rate (hallucination regression guard)
 */

import { fetchPage } from '@/lib/fetcher';
import { detectTechStack } from '@/lib/gemini/detect-tech-stack';
import type { TechStack } from '@/lib/schemas';
import { GROUND_TRUTH, type GroundTruth } from './ground-truth';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface FieldResult {
  field: string;
  expected: string | boolean | null;
  detected: string | boolean | null | undefined;
  correct: boolean;
  confidence: 'high' | 'medium' | 'low' | 'n/a';
}

export interface SiteResult {
  url: string;
  domain: string;
  source: string;
  fields: FieldResult[];
  accuracy: number;
  schema_valid: boolean;
  schema_error?: string;
  detection_time_ms: number;
  error?: string;
}

export interface EvalReport {
  run_at: string;
  model: string;
  total_sites: number;
  sites_completed: number;
  sites_errored: number;
  overall_accuracy: number;
  field_accuracy: Record<string, { correct: number; total: number; pct: number }>;
  calibration: {
    high: { correct: number; total: number; pct: number };
    medium: { correct: number; total: number; pct: number };
    low: { correct: number; total: number; pct: number };
  };
  schema_pass_rate: number;
  sites: SiteResult[];
}

// ---------------------------------------------------------------------------
// Comparison helpers
// ---------------------------------------------------------------------------

/** Case-insensitive includes match for strings. */
function stringsMatch(expected: string, detected: string): boolean {
  const e = expected.toLowerCase().trim();
  const d = detected.toLowerCase().trim();
  return d.includes(e) || e.includes(d);
}

/** Check if a detected value is effectively "none". */
function isNone(value: string | null | undefined): boolean {
  if (value == null) return true;
  const v = value.toLowerCase().trim();
  return (
    v === 'none' ||
    v === 'none detected' ||
    v === 'n/a' ||
    v === 'unknown' ||
    v === ''
  );
}

/**
 * Extract a detected value and its confidence from the TechStack result.
 */
function getDetectedField(
  techStack: TechStack,
  field: string,
): { value: string | boolean | null | undefined; confidence: 'high' | 'medium' | 'low' | 'n/a' } {
  switch (field) {
    case 'framework':
      return {
        value: techStack.frontend_framework.name,
        confidence: techStack.frontend_framework.confidence,
      };
    case 'is_nextjs':
      return {
        value: techStack.frontend_framework.is_nextjs,
        confidence: 'n/a',
      };
    case 'hosting':
      return {
        value: techStack.hosting.name,
        confidence: techStack.hosting.confidence,
      };
    case 'is_vercel':
      return {
        value: techStack.hosting.is_vercel,
        confidence: 'n/a',
      };
    case 'cms':
      return {
        value: techStack.cms?.name ?? null,
        confidence: techStack.cms?.confidence ?? 'n/a',
      };
    case 'commerce':
      return {
        value: techStack.commerce?.name ?? null,
        confidence: techStack.commerce?.confidence ?? 'n/a',
      };
    case 'rendering_strategy':
      return {
        value: techStack.rendering_analysis.primary_strategy,
        confidence: 'n/a',
      };
    case 'composable_maturity':
      return {
        value: techStack.composable_maturity,
        confidence: 'n/a',
      };
    default:
      return { value: undefined, confidence: 'n/a' };
  }
}

/**
 * Compare an expected field value against the detected value.
 */
function compareField(
  field: string,
  expected: string | boolean | null | undefined,
  detected: string | boolean | null | undefined,
): boolean {
  // Skip undefined expected fields
  if (expected === undefined) return true;

  // null expected = should NOT have this technology
  if (expected === null) {
    if (typeof detected === 'string') return isNone(detected);
    return detected == null;
  }

  // Boolean fields: exact match
  if (typeof expected === 'boolean') {
    return expected === detected;
  }

  // String fields: case-insensitive includes match
  if (typeof expected === 'string' && typeof detected === 'string') {
    return stringsMatch(expected, detected);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Field definitions to compare
// ---------------------------------------------------------------------------

const COMPARED_FIELDS = [
  'framework',
  'is_nextjs',
  'hosting',
  'is_vercel',
  'cms',
  'commerce',
  'rendering_strategy',
  'composable_maturity',
] as const;

function getExpectedValue(
  expected: GroundTruth['expected'],
  field: string,
): string | boolean | null | undefined {
  switch (field) {
    case 'framework':
      return expected.framework;
    case 'is_nextjs':
      return expected.is_nextjs;
    case 'hosting':
      return expected.hosting;
    case 'is_vercel':
      return expected.is_vercel;
    case 'cms':
      return expected.cms;
    case 'commerce':
      return expected.commerce;
    case 'rendering_strategy':
      return expected.rendering_strategy;
    case 'composable_maturity':
      return expected.composable_maturity;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Main eval runner
// ---------------------------------------------------------------------------

export async function runEval(): Promise<EvalReport> {
  const siteResults: SiteResult[] = [];
  let totalCorrect = 0;
  let totalCompared = 0;

  const fieldAccum: Record<string, { correct: number; total: number }> = {};
  const calibrationAccum: Record<string, { correct: number; total: number }> = {
    high: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    low: { correct: 0, total: 0 },
  };

  for (const gt of GROUND_TRUTH) {
    console.log(`  Analysing ${gt.domain}...`);

    const start = performance.now();
    let techStack: TechStack | null = null;
    let schemaValid = true;
    let schemaError: string | undefined;
    let pipelineError: string | undefined;

    try {
      const { html, headers } = await fetchPage(gt.url);

      if (!html) {
        pipelineError = 'fetchPage returned empty HTML';
        schemaValid = false;
      } else {
        techStack = await detectTechStack(html, headers, gt.domain);
      }
    } catch (err) {
      pipelineError = err instanceof Error ? err.message : String(err);
      schemaValid = false;
    }

    const detectionTime = performance.now() - start;

    // Check for degraded result (schema validation failure in detectTechStack)
    if (
      techStack &&
      techStack.frontend_framework.name === 'detection-failed'
    ) {
      schemaValid = false;
      schemaError = techStack.frontend_framework.evidence;
    }

    // Compare fields
    const fields: FieldResult[] = [];

    if (techStack) {
      for (const field of COMPARED_FIELDS) {
        const expectedVal = getExpectedValue(gt.expected, field);

        // Skip undefined expected fields
        if (expectedVal === undefined) continue;

        const { value: detectedVal, confidence } = getDetectedField(techStack, field);
        const correct = compareField(field, expectedVal, detectedVal);

        fields.push({
          field,
          expected: expectedVal,
          detected: detectedVal,
          correct,
          confidence,
        });

        // Accumulate totals
        totalCompared++;
        if (correct) totalCorrect++;

        // Per-field accuracy
        if (!fieldAccum[field]) fieldAccum[field] = { correct: 0, total: 0 };
        fieldAccum[field].total++;
        if (correct) fieldAccum[field].correct++;

        // Confidence calibration (only for fields with real confidence)
        if (confidence !== 'n/a') {
          calibrationAccum[confidence].total++;
          if (correct) calibrationAccum[confidence].correct++;
        }
      }
    }

    const siteAccuracy =
      fields.length > 0
        ? (fields.filter((f) => f.correct).length / fields.length) * 100
        : 0;

    siteResults.push({
      url: gt.url,
      domain: gt.domain,
      source: gt.source,
      fields,
      accuracy: siteAccuracy,
      schema_valid: schemaValid,
      schema_error: schemaError,
      detection_time_ms: Math.round(detectionTime),
      error: pipelineError,
    });
  }

  // Build field accuracy map
  const fieldAccuracy: EvalReport['field_accuracy'] = {};
  for (const [field, stats] of Object.entries(fieldAccum)) {
    fieldAccuracy[field] = {
      ...stats,
      pct: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    };
  }

  // Build calibration
  const calibration: EvalReport['calibration'] = {
    high: {
      ...calibrationAccum.high,
      pct:
        calibrationAccum.high.total > 0
          ? (calibrationAccum.high.correct / calibrationAccum.high.total) * 100
          : 0,
    },
    medium: {
      ...calibrationAccum.medium,
      pct:
        calibrationAccum.medium.total > 0
          ? (calibrationAccum.medium.correct / calibrationAccum.medium.total) * 100
          : 0,
    },
    low: {
      ...calibrationAccum.low,
      pct:
        calibrationAccum.low.total > 0
          ? (calibrationAccum.low.correct / calibrationAccum.low.total) * 100
          : 0,
    },
  };

  const sitesCompleted = siteResults.filter((s) => !s.error).length;
  const sitesErrored = siteResults.filter((s) => !!s.error).length;
  const schemaPassCount = siteResults.filter((s) => s.schema_valid).length;

  return {
    run_at: new Date().toISOString(),
    model: 'gemini-2.5-pro',
    total_sites: GROUND_TRUTH.length,
    sites_completed: sitesCompleted,
    sites_errored: sitesErrored,
    overall_accuracy:
      totalCompared > 0 ? (totalCorrect / totalCompared) * 100 : 0,
    field_accuracy: fieldAccuracy,
    calibration,
    schema_pass_rate:
      siteResults.length > 0
        ? (schemaPassCount / siteResults.length) * 100
        : 0,
    sites: siteResults,
  };
}
