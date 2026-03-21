"use client"

import type { TechStack } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface TechStackPanelProps {
  data: TechStack
}

const confidenceColors: Record<string, string> = {
  high: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-red-500/20 text-red-400",
}

const impactColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-emerald-500/20 text-emerald-400",
}

const maturityColors: Record<string, string> = {
  monolithic: "bg-red-500/20 text-red-400",
  "partially-decoupled": "bg-amber-500/20 text-amber-400",
  headless: "bg-blue-500/20 text-blue-400",
  "fully-composable": "bg-emerald-500/20 text-emerald-400",
}

interface DetectedTech {
  name: string
  confidence: string
  evidence: string
}

function ComposableItem({
  label,
  tech,
}: {
  label: string
  tech: DetectedTech | undefined | null
}) {
  if (!tech) return null
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{tech.name}</p>
      </div>
      <Badge
        variant="secondary"
        className={confidenceColors[tech.confidence] ?? ""}
      >
        {tech.confidence}
      </Badge>
    </div>
  )
}

export function TechStackPanel({ data }: TechStackPanelProps) {
  const fw = data?.frontend_framework
  const hosting = data?.hosting
  const cdn = data?.cdn
  const rendering = data?.rendering_analysis

  const composableEntries: { label: string; tech: DetectedTech | undefined | null }[] = [
    { label: "CMS", tech: data?.cms },
    { label: "Commerce", tech: data?.commerce },
    { label: "Search", tech: data?.search },
    { label: "Media / DAM", tech: data?.media_dam },
    { label: "A/B Testing", tech: data?.ab_testing },
    { label: "Personalization", tech: data?.personalization },
    { label: "Auth", tech: data?.auth },
    { label: "Payments", tech: data?.payments },
    { label: "Monitoring", tech: data?.monitoring },
  ]

  const detectedComposable = composableEntries.filter((e) => e.tech)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tech Stack</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Framework */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Framework
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {fw?.name ?? "Not detected"}
            </span>
            {fw?.version && (
              <span className="text-xs text-muted-foreground">
                v{fw.version}
              </span>
            )}
            {fw?.confidence && (
              <Badge
                variant="secondary"
                className={confidenceColors[fw.confidence] ?? ""}
              >
                {fw.confidence}
              </Badge>
            )}
          </div>
        </div>

        {/* Self-hosted Next.js Banner */}
        {fw?.is_nextjs && fw?.is_self_hosted && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-medium text-amber-400">
              Self-hosted Next.js detected &mdash; migration opportunity
            </p>
          </div>
        )}

        {/* Hosting & CDN */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Hosting
            </p>
            <p className="text-sm">{hosting?.name ?? "Not detected"}</p>
            {hosting?.confidence && (
              <Badge
                variant="secondary"
                className={confidenceColors[hosting.confidence] ?? ""}
              >
                {hosting.confidence}
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">CDN</p>
            <p className="text-sm">{cdn?.name ?? "Not detected"}</p>
            {cdn?.confidence && (
              <Badge
                variant="secondary"
                className={confidenceColors[cdn.confidence] ?? ""}
              >
                {cdn.confidence}
              </Badge>
            )}
          </div>
        </div>

        {/* Composable Ecosystem */}
        {detectedComposable.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Composable Ecosystem
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {detectedComposable.map((entry) => (
                <ComposableItem
                  key={entry.label}
                  label={entry.label}
                  tech={entry.tech}
                />
              ))}
            </div>
          </div>
        )}

        {/* Composable Maturity */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Composable Maturity
          </p>
          <Badge
            variant="secondary"
            className={
              maturityColors[data?.composable_maturity ?? ""] ??
              "bg-muted text-muted-foreground"
            }
          >
            {data?.composable_maturity ?? "N/A"}
          </Badge>
        </div>

        {/* Rendering Strategy */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Rendering Strategy
          </p>
          <Badge variant="outline" className="uppercase">
            {rendering?.primary_strategy ?? "Unknown"}
          </Badge>
          {rendering?.evidence && (
            <p className="text-xs text-muted-foreground">
              {rendering.evidence}
            </p>
          )}
        </div>

        {/* Third-Party Scripts */}
        {data?.third_party_scripts && data.third_party_scripts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Third-Party Scripts
            </p>
            <div className="space-y-2">
              {data.third_party_scripts.map((script, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{script.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {script.purpose}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      impactColors[script.estimated_impact] ??
                      "bg-muted text-muted-foreground"
                    }
                  >
                    {script.estimated_impact} impact
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
