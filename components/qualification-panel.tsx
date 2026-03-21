"use client"

import type { Qualification } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DealScoreBadge } from "@/components/deal-score-badge"

interface QualificationPanelProps {
  data: Qualification
}

const fitColors: Record<string, string> = {
  strong: "bg-emerald-500/20 text-emerald-400",
  moderate: "bg-amber-500/20 text-amber-400",
  weak: "bg-red-500/20 text-red-400",
}

const actionStyles: Record<string, string> = {
  "immediate-outreach": "bg-emerald-500/20 text-emerald-400",
  "schedule-discovery-call": "bg-blue-500/20 text-blue-400",
  "add-to-nurture": "bg-amber-500/20 text-amber-400",
  deprioritise: "bg-red-500/20 text-red-400",
  "already-on-vercel": "bg-violet-500/20 text-violet-400",
}

function formatAction(action: string): string {
  return action
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function QualificationPanel({ data }: QualificationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Qualification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deal Score */}
        <div className="flex items-center gap-4">
          <span className="text-4xl font-bold tabular-nums">
            {data?.deal_score ?? "N/A"}
          </span>
          {data?.deal_score != null && (
            <DealScoreBadge score={data.deal_score} />
          )}
        </div>

        {/* Traffic Tier */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Traffic Tier
          </p>
          <Badge variant="outline" className="capitalize">
            {data?.traffic_tier ?? "Unknown"}
          </Badge>
        </div>

        {/* Vercel Fit */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Vercel Fit
          </p>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={
                fitColors[data?.vercel_fit?.score ?? ""] ??
                "bg-muted text-muted-foreground"
              }
            >
              {data?.vercel_fit?.score ?? "N/A"}
            </Badge>
            {data?.vercel_fit?.already_on_vercel && (
              <Badge variant="secondary" className="bg-violet-500/20 text-violet-400">
                Already on Vercel
              </Badge>
            )}
          </div>
          {data?.vercel_fit?.rationale && (
            <p className="text-xs text-muted-foreground">
              {data.vercel_fit.rationale}
            </p>
          )}
        </div>

        {/* Company Profile */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Company Profile
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {data?.company_profile?.estimated_size ?? "Unknown"}
            </Badge>
            <Badge variant="outline">
              {data?.company_profile?.industry_vertical ?? "N/A"}
            </Badge>
            <Badge variant="outline">
              {data?.company_profile?.b2b_or_b2c ?? "Unknown"}
            </Badge>
          </div>
        </div>

        {/* Migration Signals */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Migration Signals
          </p>
          <div className="flex flex-wrap gap-2">
            {data?.migration_signals?.hiring_frontend && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                Hiring Frontend
              </Badge>
            )}
            {data?.migration_signals?.mentions_headless && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                Headless Mentions
              </Badge>
            )}
            {data?.migration_signals?.recent_replatform && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                Recent Replatform
              </Badge>
            )}
          </div>
          {data?.migration_signals?.hiring_signals &&
            data.migration_signals.hiring_signals.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Hiring Signals
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                  {data.migration_signals.hiring_signals.map(
                    (signal, idx) => (
                      <li key={idx}>{signal}</li>
                    )
                  )}
                </ul>
              </div>
            )}
          {data?.migration_signals?.evidence && (
            <p className="text-xs text-muted-foreground">
              {data.migration_signals.evidence}
            </p>
          )}
        </div>

        {/* Blockers */}
        {data?.vercel_fit?.blockers &&
          data.vercel_fit.blockers.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Blockers
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                {data.vercel_fit.blockers.map((blocker, idx) => (
                  <li key={idx}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}

        {/* Accelerators */}
        {data?.vercel_fit?.accelerators &&
          data.vercel_fit.accelerators.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Accelerators
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                {data.vercel_fit.accelerators.map((acc, idx) => (
                  <li key={idx}>{acc}</li>
                ))}
              </ul>
            </div>
          )}

        {/* Recommended Action */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Recommended Action
          </p>
          <Badge
            variant="secondary"
            className={
              actionStyles[data?.recommended_action ?? ""] ??
              "bg-muted text-muted-foreground"
            }
          >
            {formatAction(data?.recommended_action ?? "N/A")}
          </Badge>
          {data?.action_rationale && (
            <p className="text-xs text-muted-foreground">
              {data.action_rationale}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
