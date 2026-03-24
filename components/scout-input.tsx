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
  const [query, setQuery] = useState("")
  const [discovering, setDiscovering] = useState(false)

  const urls = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const count = urls.length

  async function handleDiscover() {
    if (!query.trim() || discovering) return
    setDiscovering(true)

    try {
      const res = await fetch("/api/scout/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error("Discover failed:", data.error)
        return
      }

      const data = await res.json()
      const discovered = (data.companies ?? [])
        .map((c: { url: string }) => c.url)
        .filter((u: string) => u)

      if (discovered.length > 0) {
        setText((prev) => {
          const existing = prev.trim()
          return existing
            ? existing + "\n" + discovered.join("\n")
            : discovered.join("\n")
        })
      }
    } catch (err) {
      console.error("Discover error:", err)
    } finally {
      setDiscovering(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder='Search for prospects, e.g. "UK e-commerce companies" or "fintech startups Germany"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleDiscover()
          }}
          disabled={disabled || discovering}
        />
        <Button
          variant="outline"
          onClick={handleDiscover}
          disabled={disabled || discovering || !query.trim()}
          className="px-5 shrink-0"
        >
          {discovering ? "Finding..." : "Find prospects"}
        </Button>
      </div>

      {/* URL textarea */}
      <textarea
        className="w-full min-h-[180px] rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        placeholder="Paste URLs, one per line (max 50) — or use search above to find prospects"
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
