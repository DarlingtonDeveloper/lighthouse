'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PipelineProgress, type StageState } from './pipeline-progress'

interface UrlInputProps {
  onAnalysisComplete: (data: any) => void
}

const STAGE_KEYS = [
  'fetch',
  'techstack',
  'performance',
  'qualification',
  'value',
  'architecture',
  'storage',
] as const

function initialStages(): Record<string, StageState> {
  const stages: Record<string, StageState> = {}
  for (const key of STAGE_KEYS) {
    stages[key] = { status: 'pending' }
  }
  return stages
}

export function UrlInput({ onAnalysisComplete }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [stages, setStages] = useState<Record<string, StageState>>(initialStages)
  const [error, setError] = useState<string | null>(null)

  const hasActivity = Object.values(stages).some((s) => s.status !== 'pending')

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!url.trim() || isRunning) return

      setIsRunning(true)
      setStages(initialStages())
      setError(null)

      try {
        const response = await fetch('/api/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        if (!response.ok) {
          setError(`Request failed with status ${response.status}`)
          return
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue

            try {
              const { stage, data } = JSON.parse(line.slice(6))

              if (stage === 'complete') {
                onAnalysisComplete(data)
              } else if (stage === 'error') {
                setError(data?.message ?? 'An unknown error occurred')
                setStages((prev) => ({
                  ...prev,
                  ...(data?.stage
                    ? { [data.stage]: { status: 'error' as const, data } }
                    : {}),
                }))
              } else {
                setStages((prev) => ({
                  ...prev,
                  [stage]: { ...prev[stage], ...data },
                }))
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred'
        )
      } finally {
        setIsRunning(false)
      }
    },
    [url, isRunning, onAnalysisComplete]
  )

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL to analyse (e.g., https://example.com)"
          disabled={isRunning}
          className="flex-1"
        />
        <Button type="submit" disabled={isRunning}>
          {isRunning ? 'Analysing...' : 'Analyse'}
        </Button>
      </form>

      {(isRunning || hasActivity) && <PipelineProgress stages={stages} />}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
