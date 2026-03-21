"use client"

import { cwvRating, formatMs, type CwvRating } from "@/lib/utils"

interface CwvIndicatorProps {
  metric: string
  value: number | null
  unit?: string
}

const dotColors: Record<CwvRating, string> = {
  good: "bg-emerald-400",
  "needs-improvement": "bg-amber-400",
  poor: "bg-red-400",
  unknown: "bg-muted-foreground/40",
}

export function CwvIndicator({ metric, value, unit }: CwvIndicatorProps) {
  const rating = cwvRating(metric, value)
  const dotColor = dotColors[rating]

  let displayValue: string
  if (value === null) {
    displayValue = "N/A"
  } else if (unit === "ms") {
    displayValue = formatMs(value)
  } else {
    displayValue = unit ? `${value}${unit}` : `${value}`
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`inline-block size-2 shrink-0 rounded-full ${dotColor}`}
        aria-label={`${metric} rating: ${rating}`}
      />
      <span>{displayValue}</span>
    </span>
  )
}
