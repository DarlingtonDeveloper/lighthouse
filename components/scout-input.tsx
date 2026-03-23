"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface ScoutInputProps {
  onStart: (urls: string[], options: { tier3Limit: number; skipVercel: boolean }) => void
  disabled: boolean
}

export function ScoutInput({ onStart, disabled }: ScoutInputProps) {
  const [text, setText] = useState("")
  const [tier3Limit, setTier3Limit] = useState(5)
  const [includeVercel, setIncludeVercel] = useState(false)

  const urls = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const count = urls.length

  return (
    <div className="space-y-4">
      <textarea
        className="w-full min-h-[200px] rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        placeholder="Paste URLs, one per line (max 50)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {count} {count === 1 ? "URL" : "URLs"} entered
          </span>

          <label className="flex items-center gap-2 text-muted-foreground">
            Full analysis on top
            <input
              type="number"
              min={0}
              max={10}
              value={tier3Limit}
              onChange={(e) => setTier3Limit(Number(e.target.value))}
              className="w-14 rounded border border-border bg-background px-2 py-1 text-center text-sm"
              disabled={disabled}
            />
            prospects
          </label>

          <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeVercel}
              onChange={(e) => setIncludeVercel(e.target.checked)}
              className="rounded"
              disabled={disabled}
            />
            Include sites already on Vercel
          </label>
        </div>

        <Button
          onClick={() =>
            onStart(urls, { tier3Limit, skipVercel: !includeVercel })
          }
          disabled={disabled || count === 0 || count > 50}
          className="px-6"
        >
          {disabled ? "Scanning..." : "Scout"}
        </Button>
      </div>
    </div>
  )
}
