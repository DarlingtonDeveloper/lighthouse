"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DealScoreBadge } from "@/components/deal-score-badge"

interface ProspectCardProps {
  prospect: any
}

export function ProspectCard({ prospect }: ProspectCardProps) {
  const meta = prospect.metadata ?? {}
  const domain =
    meta.domain ?? prospect.title ?? "Unknown"

  const dealScore = meta.deal_score ?? meta.dealScore ?? null
  const framework = meta.framework ?? null
  const hosting = meta.hosting ?? null
  const trafficTier = meta.traffic_tier ?? meta.trafficTier ?? null
  const vercelFit = meta.vercel_fit ?? meta.vercelFit ?? null
  const recommendedAction =
    meta.recommended_action ?? meta.recommendedAction ?? null

  return (
    <Link
      href={`/prospects/${encodeURIComponent(domain)}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
    >
      <Card className="transition-colors hover:bg-muted/40 cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate">{domain}</CardTitle>
            {dealScore !== null && <DealScoreBadge score={dealScore} />}
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {framework && (
              <Badge variant="outline" className="text-xs">
                {framework}
              </Badge>
            )}
            {hosting && (
              <Badge variant="outline" className="text-xs">
                {hosting}
              </Badge>
            )}
            {trafficTier && (
              <Badge variant="secondary" className="text-xs">
                {trafficTier}
              </Badge>
            )}
            {vercelFit !== null && (
              <Badge
                variant="secondary"
                className="text-xs bg-blue-500/20 text-blue-400 border-transparent"
              >
                Vercel Fit: {vercelFit}
              </Badge>
            )}
            {recommendedAction && (
              <Badge
                variant="secondary"
                className="text-xs bg-violet-500/20 text-violet-400 border-transparent"
              >
                {recommendedAction}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
