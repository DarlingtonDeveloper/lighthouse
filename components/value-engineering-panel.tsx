"use client"

import type { ValueEngineering } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ValueEngineeringPanelProps {
  data: ValueEngineering
}

const complexityColors: Record<string, string> = {
  trivial: "bg-emerald-500/20 text-emerald-400",
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-red-500/20 text-red-400",
}

const riskColors: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-red-500/20 text-red-400",
}

function formatApproach(approach: string): string {
  return approach
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function ValueEngineeringPanel({ data }: ValueEngineeringPanelProps) {
  const revenue = data?.revenue_impact
  const perf = revenue?.performance_improvement_potential
  const conversion = revenue?.conversion_rate_impact
  const tco = data?.tco_comparison
  const current = tco?.current_stack_estimate
  const vercel = tco?.vercel_estimate
  const migration = data?.migration
  const caseStudy = data?.closest_case_study

  return (
    <Card>
      <CardHeader>
        <CardTitle>Value Engineering</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Revenue Impact */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Revenue Impact</h3>

          {/* Performance Improvement */}
          {perf && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border/50 px-3 py-2 space-y-1">
                  <p className="text-xs text-muted-foreground">LCP</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span>{perf.current_lcp_ms ?? "N/A"}ms</span>
                    <span className="text-muted-foreground">&rarr;</span>
                    <span className="text-emerald-400">
                      {perf.projected_lcp_ms ?? "N/A"}ms
                    </span>
                    {perf.lcp_improvement_pct != null && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/20 text-emerald-400"
                      >
                        -{perf.lcp_improvement_pct}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-border/50 px-3 py-2 space-y-1">
                  <p className="text-xs text-muted-foreground">TTFB</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span>{perf.current_ttfb_ms ?? "N/A"}ms</span>
                    <span className="text-muted-foreground">&rarr;</span>
                    <span className="text-emerald-400">
                      {perf.projected_ttfb_ms ?? "N/A"}ms
                    </span>
                    {perf.ttfb_improvement_pct != null && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/20 text-emerald-400"
                      >
                        -{perf.ttfb_improvement_pct}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conversion Rate Lift */}
          {conversion && (
            <div className="rounded-md border border-border/50 px-3 py-2 space-y-1">
              <p className="text-xs text-muted-foreground">
                Conversion Rate Lift
              </p>
              <p className="text-sm font-medium">
                +{conversion.estimated_conversion_lift_pct ?? "N/A"}%
              </p>
              {conversion.methodology && (
                <p className="text-xs text-muted-foreground">
                  Methodology: {conversion.methodology}
                </p>
              )}
              {conversion.rationale && (
                <p className="text-xs text-muted-foreground">
                  {conversion.rationale}
                </p>
              )}
            </div>
          )}

          {/* Qualitative Revenue Drivers */}
          {revenue?.qualitative_revenue_drivers &&
            revenue.qualitative_revenue_drivers.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Revenue Drivers
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                  {revenue.qualitative_revenue_drivers.map((driver, idx) => (
                    <li key={idx}>{driver}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>

        {/* TCO Comparison */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">TCO Comparison</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Current Stack */}
            {current && (
              <div className="rounded-md border border-border/50 px-3 py-2 space-y-2">
                <p className="text-xs font-medium">Current Stack</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Hosting</span>
                    <span>{current.hosting_monthly ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CDN</span>
                    <span>{current.cdn_monthly ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CI/CD</span>
                    <span>{current.ci_cd_monthly ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monitoring</span>
                    <span>{current.monitoring_monthly ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-t border-border/50 pt-1 font-medium text-foreground">
                    <span>Total</span>
                    <span>{current.total_monthly_estimate ?? "N/A"}</span>
                  </div>
                </div>
                {current.developer_infra_time_pct != null && (
                  <p className="text-xs text-muted-foreground">
                    Dev infra time: {current.developer_infra_time_pct}%
                  </p>
                )}
              </div>
            )}

            {/* Vercel Estimate */}
            {vercel && (
              <div className="rounded-md border border-border/50 px-3 py-2 space-y-2">
                <p className="text-xs font-medium">Vercel Estimate</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Plan</span>
                    <Badge variant="outline" className="text-[10px]">
                      {vercel.plan_recommendation ?? "N/A"}
                    </Badge>
                  </div>
                  <div className="flex justify-between font-medium text-foreground">
                    <span>Monthly</span>
                    <span>{vercel.estimated_monthly ?? "N/A"}</span>
                  </div>
                </div>
                {vercel.includes && vercel.includes.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Includes:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                      {vercel.includes.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {vercel.developer_infra_time_pct != null && (
                  <p className="text-xs text-muted-foreground">
                    Dev infra time: {vercel.developer_infra_time_pct}%
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Developer Time Comparison */}
          {current?.developer_infra_time_pct != null &&
            vercel?.developer_infra_time_pct != null && (
              <div className="rounded-md border border-border/50 px-3 py-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Developer Infrastructure Time
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span>{current.developer_infra_time_pct}%</span>
                  <span className="text-muted-foreground">&rarr;</span>
                  <span className="text-emerald-400">
                    {vercel.developer_infra_time_pct}%
                  </span>
                </div>
              </div>
            )}

          {tco?.savings_narrative && (
            <p className="text-xs text-muted-foreground">
              {tco.savings_narrative}
            </p>
          )}
        </div>

        {/* Migration */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Migration</h3>

          <div className="flex flex-wrap gap-2">
            {migration?.complexity && (
              <Badge
                variant="secondary"
                className={
                  complexityColors[migration.complexity] ??
                  "bg-muted text-muted-foreground"
                }
              >
                {migration.complexity} complexity
              </Badge>
            )}
            {migration?.estimated_effort && (
              <Badge variant="outline">{migration.estimated_effort}</Badge>
            )}
            {migration?.approach && (
              <Badge variant="outline">
                {formatApproach(migration.approach)}
              </Badge>
            )}
          </div>

          {migration?.approach_rationale && (
            <p className="text-xs text-muted-foreground">
              {migration.approach_rationale}
            </p>
          )}

          {/* Migration Steps */}
          {migration?.migration_steps &&
            migration.migration_steps.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Migration Steps
                </p>
                <ol className="space-y-2">
                  {migration.migration_steps.map((step) => (
                    <li
                      key={step.step}
                      className="rounded-md border border-border/50 px-3 py-2 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {step.step}
                        </span>
                        <span className="text-sm font-medium">
                          {step.title}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {step.effort}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            riskColors[step.risk_level] ??
                            "bg-muted text-muted-foreground"
                          }
                        >
                          {step.risk_level} risk
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground pl-7">
                        {step.description}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

          {/* Risks */}
          {migration?.risks && migration.risks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Risks & Mitigations
              </p>
              <ul className="space-y-2">
                {migration.risks.map((risk, idx) => (
                  <li
                    key={idx}
                    className="rounded-md border border-border/50 px-3 py-2 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{risk.risk}</span>
                      <Badge
                        variant="secondary"
                        className={
                          riskColors[risk.severity] ??
                          "bg-muted text-muted-foreground"
                        }
                      >
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mitigation: {risk.mitigation}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Case Study Match */}
        {caseStudy && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Case Study Match</h3>
            <div className="rounded-md border border-border/50 px-3 py-2 space-y-2">
              <p className="text-sm font-medium">
                {caseStudy.company ?? "N/A"}
              </p>
              {caseStudy.similarity_rationale && (
                <p className="text-xs text-muted-foreground">
                  {caseStudy.similarity_rationale}
                </p>
              )}
              {caseStudy.key_outcomes &&
                caseStudy.key_outcomes.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                    {caseStudy.key_outcomes.map((outcome, idx) => (
                      <li key={idx}>{outcome}</li>
                    ))}
                  </ul>
                )}
              {caseStudy.reference_url && (
                <a
                  href={caseStudy.reference_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 underline underline-offset-2 hover:text-blue-300"
                >
                  View case study
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
