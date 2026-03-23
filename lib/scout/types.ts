// ---------------------------------------------------------------------------
// Scout — shared types for the territory qualification pipeline
// ---------------------------------------------------------------------------

export interface Tier1Result {
  url: string
  domain: string
  reachable: boolean
  status_code: number | null
  response_time_ms: number | null
  is_vercel: boolean
  is_nextjs: boolean
  is_react: boolean
  js_framework_signal: string | null
  server_header: string | null
  cdn_signal: string | null
  cdn_evidence: string | null
  html_size_bytes: number | null
  verdict: "promote" | "skip" | "maybe"
  skip_reason: string | null
  priority_boost: boolean
  confidence: "high" | "medium" | "low"
  raw_html: string | null
  raw_headers: Record<string, string>
}

export interface Tier2Result {
  url: string
  domain: string
  framework: string
  framework_confidence: "high" | "medium" | "low"
  framework_evidence: string
  hosting: string
  hosting_confidence: "high" | "medium" | "low"
  cdn: string
  commerce_platform: string | null
  cms: string | null
  composable_maturity:
    | "monolithic"
    | "partially-decoupled"
    | "headless"
    | "fully-composable"
  industry_vertical: string
  estimated_size: "startup" | "scaleup" | "mid-market" | "enterprise" | "unknown"
  deal_score: number
  one_line_summary: string
  executive_paragraph: string
  promote_to_tier3: boolean
  rationale: string
}

export interface ScoutResult {
  scan_id: string
  started_at: string
  completed_at: string
  input_count: number
  tier1_results: Tier1Result[]
  tier2_results: Tier2Result[]
  tier3_domains: string[]
  summary: {
    total: number
    promoted_to_tier2: number
    promoted_to_tier3: number
    skipped_vercel: number
    skipped_unreachable: number
    skipped_no_js: number
    skipped_other: number
  }
}

export interface ScoutStreamEvent {
  stage: "tier1" | "tier2" | "tier3" | "complete" | "error"
  url?: string
  data: Tier1Result | Tier2Result | ScoutResult | { message: string }
}
