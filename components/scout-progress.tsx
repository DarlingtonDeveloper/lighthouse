"use client"

interface ScoutProgressProps {
  tier1: { done: number; total: number }
  tier2: { done: number; total: number }
  tier3: { done: number; total: number }
}

export function ScoutProgress({ tier1, tier2, tier3 }: ScoutProgressProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <ProgressItem label="Scanning headers" done={tier1.done} total={tier1.total} />
      <span className="text-border">|</span>
      <ProgressItem label="Qualifying" done={tier2.done} total={tier2.total} />
      <span className="text-border">|</span>
      <ProgressItem label="Analysing" done={tier3.done} total={tier3.total} />
    </div>
  )
}

function ProgressItem({
  label,
  done,
  total,
}: {
  label: string
  done: number
  total: number
}) {
  const active = total > 0 && done < total

  return (
    <span className={active ? "text-foreground font-medium" : ""}>
      {label}: {done}/{total}
      {active && (
        <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      )}
    </span>
  )
}
