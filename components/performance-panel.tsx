"use client"

import type { PerformanceMetrics } from "@/lib/pagespeed"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CwvIndicator } from "@/components/cwv-indicator"

interface PerformancePanelProps {
  data: PerformanceMetrics
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground"
  if (score >= 90) return "text-emerald-400"
  if (score >= 50) return "text-amber-400"
  return "text-red-400"
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-muted/50"
  if (score >= 90) return "bg-emerald-500/10"
  if (score >= 50) return "bg-amber-500/10"
  return "bg-red-500/10"
}

const assessmentColors: Record<string, string> = {
  good: "bg-emerald-500/20 text-emerald-400",
  "needs-improvement": "bg-amber-500/20 text-amber-400",
  poor: "bg-red-500/20 text-red-400",
  unknown: "bg-muted text-muted-foreground",
}

export function PerformancePanel({ data }: PerformancePanelProps) {
  const score = data?.performance_score

  const labMetrics: { label: string; metric: string; value: number | null; unit: string }[] = [
    { label: "LCP", metric: "lcp", value: data?.lcp_ms ?? null, unit: "ms" },
    { label: "TTFB", metric: "ttfb", value: data?.ttfb_ms ?? null, unit: "ms" },
    { label: "CLS", metric: "cls", value: data?.cls ?? null, unit: "" },
    { label: "TBT", metric: "tbt", value: data?.tbt_ms ?? null, unit: "ms" },
    { label: "INP", metric: "inp", value: data?.inp_ms ?? null, unit: "ms" },
    { label: "FCP", metric: "fcp", value: data?.fcp_ms ?? null, unit: "ms" },
  ]

  const cruxMetrics: { label: string; metric: string; value: number | null; unit: string }[] = [
    { label: "LCP p75", metric: "lcp", value: data?.crux_lcp_p75 ?? null, unit: "ms" },
    { label: "INP p75", metric: "inp", value: data?.crux_inp_p75 ?? null, unit: "ms" },
    { label: "CLS p75", metric: "cls", value: data?.crux_cls_p75 ?? null, unit: "" },
    { label: "TTFB p75", metric: "ttfb", value: data?.crux_ttfb_p75 ?? null, unit: "ms" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div
          className={`flex items-center gap-4 rounded-lg px-4 py-3 ${scoreBg(score)}`}
        >
          <span className={`text-5xl font-bold tabular-nums ${scoreColor(score)}`}>
            {score ?? "N/A"}
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Performance Score</p>
            <p className="text-xs text-muted-foreground">Lighthouse (mobile)</p>
          </div>
        </div>

        {/* Lab Metrics */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Lab Metrics
          </p>
          <div className="space-y-1">
            {labMetrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between rounded-md px-3 py-1.5 hover:bg-muted/30"
              >
                <span className="text-sm text-muted-foreground">
                  {m.label}
                </span>
                <CwvIndicator
                  metric={m.metric}
                  value={m.value}
                  unit={m.unit || undefined}
                />
              </div>
            ))}
          </div>
        </div>

        {/* CrUX Field Data */}
        {data?.has_crux_data && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                CrUX Field Data
              </p>
              <Badge variant="outline" className="text-[10px]">
                {data?.crux_origin_data ? "Origin-level" : "URL-level"}
              </Badge>
            </div>
            <div className="space-y-1">
              {cruxMetrics.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between rounded-md px-3 py-1.5 hover:bg-muted/30"
                >
                  <span className="text-sm text-muted-foreground">
                    {m.label}
                  </span>
                  <CwvIndicator
                    metric={m.metric}
                    value={m.value}
                    unit={m.unit || undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CWV Assessment */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Core Web Vitals Assessment
          </p>
          <Badge
            variant="secondary"
            className={
              assessmentColors[data?.cwv_assessment ?? "unknown"] ??
              assessmentColors.unknown
            }
          >
            {data?.cwv_assessment ?? "Unknown"}
          </Badge>
        </div>

        {/* Screenshot */}
        {data?.screenshot_base64 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Page Screenshot
            </p>
            <div className="overflow-hidden rounded-md border border-border/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${data.screenshot_base64}`}
                alt="Page screenshot"
                className="w-full object-contain"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
