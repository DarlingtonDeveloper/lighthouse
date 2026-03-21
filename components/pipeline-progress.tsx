'use client'

export type StageState = {
  status: 'pending' | 'running' | 'complete' | 'error'
  data?: any
}

interface PipelineProgressProps {
  stages: Record<string, StageState>
}

const STAGE_LABELS: { key: string; label: string }[] = [
  { key: 'fetch', label: 'Fetching page' },
  { key: 'techstack', label: 'Detecting tech stack' },
  { key: 'performance', label: 'Measuring performance' },
  { key: 'qualification', label: 'Qualifying prospect' },
  { key: 'value', label: 'Engineering value' },
  { key: 'architecture', label: 'Designing architecture' },
]

function StatusIcon({ status }: { status: StageState['status'] }) {
  switch (status) {
    case 'pending':
      return <span className="text-muted-foreground/50">&#9675;</span>
    case 'running':
      return (
        <span className="inline-block animate-spin text-foreground">
          &#10227;
        </span>
      )
    case 'complete':
      return <span className="text-emerald-400">&#10003;</span>
    case 'error':
      return <span className="text-red-400">&#10007;</span>
  }
}

export function PipelineProgress({ stages }: PipelineProgressProps) {
  return (
    <ul className="space-y-1.5 text-sm font-mono">
      {STAGE_LABELS.map(({ key, label }) => {
        const stage = stages[key]
        const status = stage?.status ?? 'pending'

        const textClass =
          status === 'pending'
            ? 'text-muted-foreground/50'
            : status === 'running'
              ? 'text-foreground'
              : status === 'complete'
                ? 'text-muted-foreground'
                : 'text-red-400'

        return (
          <li key={key} className={`flex items-center gap-2 ${textClass}`}>
            <StatusIcon status={status} />
            <span>{label}</span>
          </li>
        )
      })}
    </ul>
  )
}
