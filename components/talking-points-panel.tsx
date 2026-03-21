"use client"

import type { ValueEngineering } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface TalkingPointsPanelProps {
  data: {
    talking_points: ValueEngineering["talking_points"]
    displacement: ValueEngineering["competitor_displacement"]
  }
}

const audienceLabels: Record<string, string> = {
  engineering: "Engineering",
  "engineering-leadership": "Engineering Leadership",
  executive: "Executive",
  finance: "Finance",
}

const audiences = [
  "engineering",
  "engineering-leadership",
  "executive",
  "finance",
] as const

const switchingCostColors: Record<string, string> = {
  trivial: "bg-emerald-500/20 text-emerald-400",
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-red-500/20 text-red-400",
}

const categoryColors: Record<string, string> = {
  "cloud-hosting": "bg-blue-500/20 text-blue-400",
  "edge-platform": "bg-violet-500/20 text-violet-400",
  "monolithic-cms": "bg-amber-500/20 text-amber-400",
  "self-hosted": "bg-red-500/20 text-red-400",
}

export function TalkingPointsPanel({ data }: TalkingPointsPanelProps) {
  const talkingPoints = data?.talking_points ?? []
  const displacement = data?.displacement

  const pointsByAudience = audiences.reduce(
    (acc, audience) => {
      acc[audience] = talkingPoints.filter((tp) => tp.audience === audience)
      return acc
    },
    {} as Record<string, typeof talkingPoints>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Talking Points & Competitive Displacement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Talking Points by Audience */}
        {talkingPoints.length > 0 ? (
          <Tabs defaultValue="engineering">
            <TabsList>
              {audiences.map((audience) => (
                <TabsTrigger key={audience} value={audience}>
                  {audienceLabels[audience]}
                </TabsTrigger>
              ))}
            </TabsList>

            {audiences.map((audience) => (
              <TabsContent key={audience} value={audience}>
                {pointsByAudience[audience] &&
                pointsByAudience[audience].length > 0 ? (
                  <div className="space-y-3 pt-3">
                    {pointsByAudience[audience].map((tp, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-border/50 px-3 py-2 space-y-1"
                      >
                        <p className="text-sm">{tp.point ?? "N/A"}</p>
                        {tp.supporting_data && (
                          <p className="text-xs text-muted-foreground">
                            {tp.supporting_data}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pt-3 text-xs text-muted-foreground">
                    No talking points for this audience.
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <p className="text-xs text-muted-foreground">
            No talking points available.
          </p>
        )}

        {/* Competitive Displacement */}
        {displacement && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Competitive Displacement</h3>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {displacement.current_provider ?? "N/A"}
              </span>
              {displacement.provider_category && (
                <Badge
                  variant="secondary"
                  className={
                    categoryColors[displacement.provider_category] ??
                    "bg-muted text-muted-foreground"
                  }
                >
                  {displacement.provider_category}
                </Badge>
              )}
              {displacement.switching_cost && (
                <Badge
                  variant="secondary"
                  className={
                    switchingCostColors[displacement.switching_cost] ??
                    "bg-muted text-muted-foreground"
                  }
                >
                  {displacement.switching_cost} switching cost
                </Badge>
              )}
            </div>

            {/* Key Differentiators */}
            {displacement.key_differentiators &&
              displacement.key_differentiators.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Key Differentiators
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                    {displacement.key_differentiators.map((diff, idx) => (
                      <li key={idx}>{diff}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Common Objections */}
            {displacement.common_objections &&
              displacement.common_objections.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Common Objections & Responses
                  </p>
                  <div className="space-y-2">
                    {displacement.common_objections.map((obj, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-border/50 px-3 py-2 space-y-1"
                      >
                        <p className="text-sm font-medium">
                          {obj.objection ?? "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {obj.response ?? "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
