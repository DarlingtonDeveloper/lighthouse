"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DealScoreBadgeProps {
  score: number
}

function getScoreTier(score: number) {
  if (score >= 80) {
    return {
      label: "High priority",
      className: "bg-emerald-500/20 text-emerald-400",
    }
  }
  if (score >= 50) {
    return {
      label: "Worth pursuing",
      className: "bg-amber-500/20 text-amber-400",
    }
  }
  return {
    label: "Low priority",
    className: "bg-red-500/20 text-red-400",
  }
}

export function DealScoreBadge({ score }: DealScoreBadgeProps) {
  const { label, className } = getScoreTier(score)

  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5 border-transparent", className)}
    >
      <span className="font-semibold">{score}</span>
      <span className="text-[11px] opacity-80">{label}</span>
    </Badge>
  )
}
