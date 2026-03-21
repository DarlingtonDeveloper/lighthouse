import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract the domain from a URL string, stripping any "www." prefix.
 * Throws if the URL cannot be parsed.
 */
export function extractDomain(url: string): string {
  const parsed = new URL(url)
  const hostname = parsed.hostname
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname
}

/**
 * Returns true when the URL is a valid, publicly-routable HTTPS address.
 * Blocks localhost, private/link-local ranges, and reserved TLDs.
 */
export function isValidPublicUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:") {
    return false
  }

  const hostname = parsed.hostname

  // Block well-known non-public hostnames
  if (hostname === "localhost") return false
  if (hostname.endsWith(".local")) return false
  if (hostname.endsWith(".internal")) return false

  // Block private & reserved IPv4 ranges
  const privatePatterns: RegExp[] = [
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
    /^192\.168\.\d{1,3}\.\d{1,3}$/,
    /^169\.254\.\d{1,3}\.\d{1,3}$/,
    /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  ]

  for (const pattern of privatePatterns) {
    if (pattern.test(hostname)) return false
  }

  return true
}

/**
 * Format a millisecond value into a human-readable string.
 * Returns "N/A" for null, "1.2s" for >= 1000, "340ms" for < 1000.
 */
export function formatMs(ms: number | null): string {
  if (ms === null) return "N/A"
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

export type CwvRating = "good" | "needs-improvement" | "poor" | "unknown"

/**
 * Rate a Core Web Vital metric value according to standard thresholds.
 */
export function cwvRating(metric: string, value: number | null): CwvRating {
  if (value === null) return "unknown"

  const thresholds: Record<string, { good: number; poor: number }> = {
    lcp: { good: 2500, poor: 4000 },
    cls: { good: 0.1, poor: 0.25 },
    inp: { good: 200, poor: 500 },
    ttfb: { good: 800, poor: 1800 },
  }

  const t = thresholds[metric]
  if (!t) return "unknown"

  if (value <= t.good) return "good"
  if (value > t.poor) return "poor"
  return "needs-improvement"
}

/**
 * Generate a stable entity tag string from a domain name.
 * Dots are replaced with hyphens and prefixed with "entity-".
 */
export function entityTag(domain: string): string {
  return "entity-" + domain.replace(/\./g, "-")
}
