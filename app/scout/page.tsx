"use client"

import { useState, useCallback, useRef } from "react"
import { ScoutInput } from "@/components/scout-input"
import { ScoutProgress } from "@/components/scout-progress"
import { ScoutResultsTable } from "@/components/scout-results-table"
import type { Tier1Result, Tier2Result } from "@/lib/scout/types"

export default function ScoutPage() {
  const [running, setRunning] = useState(false)
  const [tier1Results, setTier1Results] = useState<Tier1Result[]>([])
  const [tier2Results, setTier2Results] = useState<Tier2Result[]>([])
  const [tier3Domains, setTier3Domains] = useState<string[]>([])
  const [inputCount, setInputCount] = useState(0)
  const [tier2Expected, setTier2Expected] = useState(0)
  const [tier3Expected, setTier3Expected] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const handleStart = useCallback(
    async (
      urls: string[],
      options: { tier3Limit: number; skipVercel: boolean }
    ) => {
      setRunning(true)
      setTier1Results([])
      setTier2Results([])
      setTier3Domains([])
      setInputCount(urls.length)
      setTier2Expected(0)
      setTier3Expected(options.tier3Limit)
      setError(null)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch("/api/scout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls,
            tier3_limit: options.tier3Limit,
            skip_vercel: options.skipVercel,
            skip_tier3: options.tier3Limit === 0,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error ?? `Request failed: ${res.status}`)
          setRunning(false)
          return
        }

        const reader = res.body?.getReader()
        if (!reader) {
          setError("No response body")
          setRunning(false)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const json = line.slice(6).trim()
            if (!json) continue

            try {
              const event = JSON.parse(json)

              if (event.stage === "tier1") {
                const t1 = event.data as Tier1Result
                setTier1Results((prev) => [...prev, t1])
                if (t1.verdict !== "skip") {
                  setTier2Expected((prev) => prev + 1)
                }
              } else if (event.stage === "tier2") {
                setTier2Results((prev) => [...prev, event.data as Tier2Result])
              } else if (event.stage === "tier3") {
                const msg = (event.data as { message: string }).message
                if (msg.startsWith("Full analysis complete:")) {
                  const domain = msg.replace("Full analysis complete: ", "")
                  setTier3Domains((prev) => [...prev, domain])
                }
              } else if (event.stage === "complete") {
                // Done
              } else if (event.stage === "error") {
                console.warn("Scout error event:", event.data)
              }
            } catch {
              // Ignore malformed events
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message ?? "Unknown error")
        }
      } finally {
        setRunning(false)
        abortRef.current = null
      }
    },
    []
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Scout</h1>
        <p className="text-muted-foreground text-sm">
          Batch territory qualification. Paste URLs, get a ranked prospect list.
        </p>
      </div>

      <ScoutInput onStart={handleStart} disabled={running} />

      {running && (
        <ScoutProgress
          tier1={{ done: tier1Results.length, total: inputCount }}
          tier2={{ done: tier2Results.length, total: tier2Expected }}
          tier3={{ done: tier3Domains.length, total: tier3Expected }}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <ScoutResultsTable
        tier2Results={tier2Results}
        tier3Domains={tier3Domains}
        tier1Results={tier1Results}
      />

      {!running && tier2Results.length === 0 && tier1Results.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
          <p>
            Paste a list of company URLs to qualify them for Vercel.
          </p>
          <p>
            Scout scans headers, qualifies via AI, and runs full analysis on the
            top prospects.
          </p>
        </div>
      )}
    </div>
  )
}
