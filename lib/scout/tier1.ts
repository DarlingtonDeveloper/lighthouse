import { isValidPublicUrl, extractDomain } from "@/lib/utils"
import { sanitiseForLLMCompact } from "@/lib/sanitise"
import type { Tier1Result } from "./types"

/**
 * Normalise a URL: ensure https://, strip trailing slash.
 */
function normaliseUrl(raw: string): string {
  let url = raw.trim()
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url.replace(/\/+$/, "")
}

/**
 * Tier 1 header scan — no LLM, no external APIs beyond the target URL.
 * Pure fetch + header/HTML signal analysis. < 1s per URL.
 */
export async function scanTier1(rawUrl: string): Promise<Tier1Result> {
  const url = normaliseUrl(rawUrl)

  let domain: string
  try {
    domain = extractDomain(url)
  } catch {
    return skipResult(url, rawUrl, "Invalid URL")
  }

  if (!isValidPublicUrl(url)) {
    return skipResult(url, domain, "Invalid or non-public URL")
  }

  const start = performance.now()
  let response: Response
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Lighthouse-Scout/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    })
  } catch {
    return skipResult(url, domain, "Unreachable")
  }
  const responseTime = Math.round(performance.now() - start)

  const headers: Record<string, string> = {}
  response.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v
  })

  let html: string
  try {
    html = await response.text()
  } catch {
    return skipResult(url, domain, "Failed to read response body")
  }

  const htmlSlice = html.slice(0, 100_000)

  // --- Header signals ---
  const isVercel = !!headers["x-vercel-id"]
  const serverHeader = headers["server"] ?? null

  // CDN detection
  let cdnSignal: string | null = null
  let cdnEvidence: string | null = null
  if (headers["cf-ray"]) {
    cdnSignal = "cloudflare"
    cdnEvidence = "cf-ray header"
  } else if (headers["x-amz-cf-id"] || headers["x-amz-cf-pop"]) {
    cdnSignal = "cloudfront"
    cdnEvidence = headers["x-amz-cf-id"] ? "x-amz-cf-id header" : "x-amz-cf-pop header"
  } else if (headers["x-served-by"]?.includes("cache-")) {
    cdnSignal = "fastly"
    cdnEvidence = "x-served-by header contains cache-"
  } else if (Object.keys(headers).some((h) => h.startsWith("x-akamai"))) {
    cdnSignal = "akamai"
    cdnEvidence = "x-akamai-* header"
  } else if (headers["x-vercel-cache"]) {
    cdnSignal = "vercel"
    cdnEvidence = "x-vercel-cache header"
  }

  // --- HTML signals ---
  let isNextjs = false
  let isReact = false
  let frameworkSignal: string | null = null

  if (htmlSlice.includes("/_next/")) {
    isNextjs = true
    frameworkSignal = "/_next/"
  }
  if (htmlSlice.includes("__NEXT_DATA__")) {
    isNextjs = true
    frameworkSignal = "__NEXT_DATA__"
  }
  if (htmlSlice.includes("data-reactroot") || htmlSlice.includes("__REACT_DEVTOOLS")) {
    isReact = true
    if (!frameworkSignal) frameworkSignal = "data-reactroot"
  }
  if (!frameworkSignal && htmlSlice.includes("/__nuxt/")) {
    frameworkSignal = "/__nuxt/"
  }
  if (
    !frameworkSignal &&
    (htmlSlice.includes("/static/js/main") || htmlSlice.includes("/static/js/bundle"))
  ) {
    isReact = true
    frameworkSignal = "/static/js/main"
  }
  if (!frameworkSignal && (htmlSlice.includes("ng-version") || htmlSlice.includes("ng-app"))) {
    frameworkSignal = "angular"
  }

  // --- Verdict ---
  let verdict: "promote" | "skip" | "maybe"
  let skipReason: string | null = null

  if (isVercel) {
    verdict = "skip"
    skipReason = "Already on Vercel"
  } else if (isNextjs) {
    verdict = "promote"
  } else if (isReact) {
    verdict = "promote"
  } else if (frameworkSignal) {
    verdict = "promote"
  } else {
    verdict = "maybe"
  }

  // --- Confidence ---
  let confidence: "high" | "medium" | "low"
  if (isNextjs && htmlSlice.includes("__NEXT_DATA__")) {
    confidence = "high"
  } else if (isNextjs) {
    confidence = "medium"
  } else if (isReact) {
    confidence = "medium"
  } else {
    confidence = "low"
  }

  // --- Priority boost ---
  const priorityBoost = responseTime > 500

  // --- Store raw HTML for Tier 2 (only if not skipped) ---
  const rawHtml =
    verdict !== "skip" ? sanitiseForLLMCompact(htmlSlice) : null

  return {
    url,
    domain,
    reachable: true,
    status_code: response.status,
    response_time_ms: responseTime,
    is_vercel: isVercel,
    is_nextjs: isNextjs,
    is_react: isReact,
    js_framework_signal: frameworkSignal,
    server_header: serverHeader,
    cdn_signal: cdnSignal,
    cdn_evidence: cdnEvidence,
    html_size_bytes: html.length,
    verdict,
    skip_reason: skipReason,
    priority_boost: priorityBoost,
    confidence,
    raw_html: rawHtml,
    raw_headers: verdict !== "skip" ? headers : {},
  }
}

function skipResult(url: string, domain: string, reason: string): Tier1Result {
  return {
    url,
    domain,
    reachable: false,
    status_code: null,
    response_time_ms: null,
    is_vercel: false,
    is_nextjs: false,
    is_react: false,
    js_framework_signal: null,
    server_header: null,
    cdn_signal: null,
    cdn_evidence: null,
    html_size_bytes: null,
    verdict: "skip",
    skip_reason: reason,
    priority_boost: false,
    confidence: "low",
    raw_html: null,
    raw_headers: {},
  }
}

/**
 * Run Tier 1 scans on a batch of URLs with concurrency limit of 5.
 * Yields results as they complete.
 */
export async function* scanTier1Batch(
  urls: string[]
): AsyncGenerator<Tier1Result> {
  const CONCURRENCY = 5

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(batch.map((u) => scanTier1(u)))

    for (const result of results) {
      if (result.status === "fulfilled") {
        yield result.value
      } else {
        // Should not happen since scanTier1 never throws, but be safe
        yield skipResult(batch[0], batch[0], `Unexpected error: ${result.reason}`)
      }
    }
  }
}
