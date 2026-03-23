"use client"

import { useState } from "react"
import Link from "next/link"
import type { Tier1Result, Tier2Result } from "@/lib/scout/types"

interface ScoutResultsTableProps {
  tier2Results: Tier2Result[]
  tier3Domains: string[]
  tier1Results: Tier1Result[]
}

function ScoreBadge({ score }: { score: number }) {
  let color = "bg-red-500/20 text-red-400"
  if (score >= 80) color = "bg-emerald-500/20 text-emerald-400"
  else if (score >= 50) color = "bg-amber-500/20 text-amber-400"

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}
    >
      {score}
    </span>
  )
}

function getKeySignal(r: Tier2Result): string {
  if (r.framework === "Next.js" && r.hosting !== "Vercel") return "Self-hosted Next.js"
  if (r.commerce_platform) return r.commerce_platform
  if (r.cms) return r.cms
  return r.framework_evidence.slice(0, 40)
}

export function ScoutResultsTable({
  tier2Results,
  tier3Domains,
  tier1Results,
}: ScoutResultsTableProps) {
  const [showSkipped, setShowSkipped] = useState(false)

  if (tier2Results.length === 0 && tier1Results.length === 0) return null

  // Group skipped by reason
  const skipped = tier1Results.filter((r) => r.verdict === "skip")
  const skipGroups: Record<string, string[]> = {}
  for (const r of skipped) {
    const reason = r.skip_reason ?? "Other"
    if (!skipGroups[reason]) skipGroups[reason] = []
    skipGroups[reason].push(r.domain)
  }

  const sorted = [...tier2Results].sort((a, b) => b.deal_score - a.deal_score)

  return (
    <div className="space-y-6">
      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">
                  #
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Domain
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-16">
                  Score
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Stack
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Hosting
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Key Signal
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">
                  Summary
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-32">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => {
                const hasTier3 = tier3Domains.includes(r.domain)
                const stack = [
                  r.framework,
                  r.commerce_platform,
                  r.cms,
                ]
                  .filter(Boolean)
                  .join(" / ")

                return (
                  <tr
                    key={r.domain}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {hasTier3 ? (
                        <Link
                          href={`/prospects/${encodeURIComponent(r.domain)}`}
                          className="text-blue-400 underline underline-offset-2 hover:text-blue-300"
                        >
                          {r.domain}
                        </Link>
                      ) : (
                        r.domain
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <ScoreBadge score={r.deal_score} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">
                      {stack || "unknown"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.hosting}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                      {getKeySignal(r)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell max-w-[300px] truncate">
                      {r.one_line_summary}
                    </td>
                    <td className="px-3 py-2">
                      {hasTier3 ? (
                        <Link
                          href={`/prospects/${encodeURIComponent(r.domain)}`}
                          className="text-xs text-emerald-400 hover:underline"
                        >
                          Full report ready &rarr;
                        </Link>
                      ) : r.promote_to_tier3 ? (
                        <span className="text-xs text-amber-400">
                          Analysing...
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Qualified
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Skip summary */}
      {Object.keys(skipGroups).length > 0 && (
        <div>
          <button
            onClick={() => setShowSkipped(!showSkipped)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSkipped ? "Hide" : "Show"} skipped ({skipped.length})
          </button>

          {showSkipped && (
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              {Object.entries(skipGroups).map(([reason, domains]) => (
                <div key={reason}>
                  <span className="font-medium">
                    {reason} ({domains.length}):
                  </span>{" "}
                  {domains.join(", ")}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
