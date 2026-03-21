'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { DealScoreBadge } from '@/components/deal-score-badge'
import { QualificationPanel } from '@/components/qualification-panel'
import { TechStackPanel } from '@/components/tech-stack-panel'
import { PerformancePanel } from '@/components/performance-panel'
import { ValueEngineeringPanel } from '@/components/value-engineering-panel'
import { ArchitecturePanel } from '@/components/architecture-panel'
import { TalkingPointsPanel } from '@/components/talking-points-panel'

import type { TechStack, Qualification, ValueEngineering, Architecture } from '@/lib/schemas'
import type { PerformanceMetrics } from '@/lib/pagespeed'

const actionStyles: Record<string, string> = {
  'immediate-outreach': 'bg-emerald-500/20 text-emerald-400',
  'schedule-discovery-call': 'bg-blue-500/20 text-blue-400',
  'add-to-nurture': 'bg-amber-500/20 text-amber-400',
  deprioritise: 'bg-red-500/20 text-red-400',
  'already-on-vercel': 'bg-violet-500/20 text-violet-400',
}

function formatAction(action: string): string {
  return action
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

interface DashboardContentProps {
  domain: string
  dealScore: number | null
  recommendedAction: string | null
  qualification: Qualification | null
  techStack: TechStack | null
  performance: PerformanceMetrics | null
  valueEngineering: ValueEngineering | null
  architecture: Architecture | null
}

export function DashboardContent({
  domain,
  dealScore,
  recommendedAction,
  qualification,
  techStack,
  performance,
  valueEngineering,
  architecture,
}: DashboardContentProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to all prospects
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{domain}</h1>
          {dealScore !== null && <DealScoreBadge score={dealScore} />}
          {recommendedAction && (
            <Badge
              variant="secondary"
              className={
                actionStyles[recommendedAction] ??
                'bg-muted text-muted-foreground'
              }
            >
              {formatAction(recommendedAction)}
            </Badge>
          )}
        </div>
      </div>

      {/* Row 1: Qualification + Tech Stack */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {qualification && <QualificationPanel data={qualification} />}
        {techStack && <TechStackPanel data={techStack} />}
      </div>

      {/* Row 2: Performance + Value Engineering */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {performance && <PerformancePanel data={performance} />}
        {valueEngineering && <ValueEngineeringPanel data={valueEngineering} />}
      </div>

      {/* Full width: Architecture */}
      {architecture && <ArchitecturePanel data={architecture} />}

      {/* Full width: Talking Points */}
      {valueEngineering && (
        <TalkingPointsPanel
          data={{
            talking_points: valueEngineering.talking_points,
            displacement: valueEngineering.competitor_displacement,
          }}
        />
      )}
    </div>
  )
}
