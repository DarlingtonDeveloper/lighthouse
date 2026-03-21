/**
 * pagespeed.ts
 * -------------
 * Performance-metrics client that queries both PageSpeed Insights (lab data)
 * and the Chrome UX Report (field data), then produces a unified
 * PerformanceMetrics object.  Every public function is crash-safe --
 * errors are logged and default/null values returned.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PerformanceMetrics {
  lcp_ms: number | null;
  fid_ms: number | null;
  cls: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  tbt_ms: number | null;
  inp_ms: number | null;
  speed_index_ms: number | null;
  performance_score: number | null;
  crux_lcp_p75: number | null;
  crux_inp_p75: number | null;
  crux_cls_p75: number | null;
  crux_ttfb_p75: number | null;
  has_crux_data: boolean;
  crux_origin_data: boolean;
  screenshot_base64: string | null;
  cwv_assessment: 'good' | 'needs-improvement' | 'poor' | 'unknown';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface PSIResult {
  lcp_ms: number | null;
  fid_ms: number | null;
  cls: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  tbt_ms: number | null;
  speed_index_ms: number | null;
  performance_score: number | null;
  screenshot_base64: string | null;
}

interface CrUXResult {
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  ttfb: number | null;
  _origin: boolean;
}

/** Safely read a nested numeric value. */
function numericOr(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audits: Record<string, any>,
  key: string,
): number | null {
  try {
    const v = audits?.[key]?.numericValue;
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// fetchPSI
// ---------------------------------------------------------------------------

async function fetchPSI(url: string): Promise<PSIResult | null> {
  try {
    const params = new URLSearchParams({
      url,
      strategy: 'mobile',
      category: 'performance',
    });

    const apiKey = process.env.PSI_API_KEY;
    if (apiKey) {
      params.set('key', apiKey);
    }

    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;

    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      console.error(
        'PSI: non-OK response',
        response.status,
        response.statusText,
      );
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
    const audits = data?.lighthouseResult?.audits ?? {};
    const categories = data?.lighthouseResult?.categories ?? {};

    const rawScore = categories?.performance?.score;
    const performanceScore =
      typeof rawScore === 'number' ? Math.round(rawScore * 100) : null;

    const screenshotData =
      audits?.['final-screenshot']?.details?.data ?? null;

    return {
      lcp_ms: numericOr(audits, 'largest-contentful-paint'),
      fid_ms: numericOr(audits, 'max-potential-fid'),
      cls: numericOr(audits, 'cumulative-layout-shift'),
      fcp_ms: numericOr(audits, 'first-contentful-paint'),
      ttfb_ms: numericOr(audits, 'server-response-time'),
      tbt_ms: numericOr(audits, 'total-blocking-time'),
      speed_index_ms: numericOr(audits, 'speed-index'),
      performance_score: performanceScore,
      screenshot_base64:
        typeof screenshotData === 'string' ? screenshotData : null,
    };
  } catch (error) {
    console.error('PSI: error fetching PageSpeed data', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// fetchCrUX
// ---------------------------------------------------------------------------

async function fetchCrUXRequest(
  apiKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>,
): Promise<Response> {
  const endpoint = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${apiKey}`;
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
}

async function fetchCrUX(url: string): Promise<CrUXResult | null> {
  try {
    const apiKey = process.env.CRUX_API_KEY || process.env.PSI_API_KEY;
    if (!apiKey) {
      return null;
    }

    // Try URL-level first ------------------------------------------------
    let response = await fetchCrUXRequest(apiKey, {
      url,
      formFactor: 'PHONE',
    });

    let isOrigin = false;

    // Fall back to origin-level if URL-level is 404 -----------------------
    if (response.status === 404) {
      const origin = new URL(url).origin;
      response = await fetchCrUXRequest(apiKey, {
        origin,
        formFactor: 'PHONE',
      });
      isOrigin = true;
    }

    if (!response.ok) {
      console.error(
        'CrUX: non-OK response',
        response.status,
        response.statusText,
      );
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
    const metrics = data?.record?.metrics ?? {};

    const rawCls =
      metrics?.cumulative_layout_shift?.percentiles?.p75 ?? null;

    return {
      lcp: metrics?.largest_contentful_paint?.percentiles?.p75 ?? null,
      inp: metrics?.interaction_to_next_paint?.percentiles?.p75 ?? null,
      cls: typeof rawCls === 'number' ? rawCls / 100 : null,
      ttfb:
        metrics?.experimental_time_to_first_byte?.percentiles?.p75 ?? null,
      _origin: isOrigin,
    };
  } catch (error) {
    console.error('CrUX: error fetching Chrome UX Report data', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// assessCWV
// ---------------------------------------------------------------------------

function assessCWV(
  metrics: PerformanceMetrics,
): 'good' | 'needs-improvement' | 'poor' | 'unknown' {
  // Prefer CrUX field data; fall back to lab data.
  const lcp = metrics.crux_lcp_p75 ?? metrics.lcp_ms;
  const cls = metrics.crux_cls_p75 ?? metrics.cls;
  const inp = metrics.crux_inp_p75 ?? metrics.inp_ms;

  // If we have none of the signals, we can't assess.
  if (lcp === null && cls === null && inp === null) {
    return 'unknown';
  }

  let anyPoor = false;
  let allGood = true;

  // LCP: good <= 2500, poor > 4000
  if (lcp !== null) {
    if (lcp > 4000) anyPoor = true;
    if (lcp > 2500) allGood = false;
  }

  // CLS: good <= 0.1, poor > 0.25
  if (cls !== null) {
    if (cls > 0.25) anyPoor = true;
    if (cls > 0.1) allGood = false;
  }

  // INP: good <= 200, poor > 500 (null = pass)
  if (inp !== null) {
    if (inp > 500) anyPoor = true;
    if (inp > 200) allGood = false;
  }

  if (anyPoor) return 'poor';
  if (allGood) return 'good';
  return 'needs-improvement';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getPerformanceMetrics(
  url: string,
): Promise<PerformanceMetrics> {
  const defaults: PerformanceMetrics = {
    lcp_ms: null,
    fid_ms: null,
    cls: null,
    fcp_ms: null,
    ttfb_ms: null,
    tbt_ms: null,
    inp_ms: null,
    speed_index_ms: null,
    performance_score: null,
    crux_lcp_p75: null,
    crux_inp_p75: null,
    crux_cls_p75: null,
    crux_ttfb_p75: null,
    has_crux_data: false,
    crux_origin_data: false,
    screenshot_base64: null,
    cwv_assessment: 'unknown',
  };

  try {
    const [psiSettled, cruxSettled] = await Promise.allSettled([
      fetchPSI(url),
      fetchCrUX(url),
    ]);

    // Merge PSI lab data ---------------------------------------------------
    const psi =
      psiSettled.status === 'fulfilled' ? psiSettled.value : null;

    if (psi) {
      defaults.lcp_ms = psi.lcp_ms;
      defaults.fid_ms = psi.fid_ms;
      defaults.cls = psi.cls;
      defaults.fcp_ms = psi.fcp_ms;
      defaults.ttfb_ms = psi.ttfb_ms;
      defaults.tbt_ms = psi.tbt_ms;
      defaults.speed_index_ms = psi.speed_index_ms;
      defaults.performance_score = psi.performance_score;
      defaults.screenshot_base64 = psi.screenshot_base64;
    }

    // Merge CrUX field data ------------------------------------------------
    const crux =
      cruxSettled.status === 'fulfilled' ? cruxSettled.value : null;

    if (crux) {
      defaults.crux_lcp_p75 = crux.lcp;
      defaults.crux_inp_p75 = crux.inp;
      defaults.crux_cls_p75 = crux.cls;
      defaults.crux_ttfb_p75 = crux.ttfb;
      defaults.has_crux_data = true;
      defaults.crux_origin_data = crux._origin;
    }

    // Assess Core Web Vitals -----------------------------------------------
    defaults.cwv_assessment = assessCWV(defaults);
  } catch (error) {
    console.error('getPerformanceMetrics: unexpected error', error);
  }

  return defaults;
}
