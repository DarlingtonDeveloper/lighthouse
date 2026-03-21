'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UrlInput } from '@/components/url-input'
import { ProspectCard } from '@/components/prospect-card'

interface ProspectNode {
  title: string
  body: string
  metadata?: Record<string, any>
}

export default function HomePage() {
  const router = useRouter()
  const [prospects, setProspects] = useState<ProspectNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProspects() {
      try {
        const res = await fetch('/api/prospects')
        if (!res.ok) return
        const data = await res.json()
        setProspects(data.nodes ?? [])
      } catch {
        // silently fail — the list is supplementary
      } finally {
        setLoading(false)
      }
    }

    fetchProspects()
  }, [])

  const handleAnalysisComplete = useCallback(
    (data: any) => {
      const domain = data?.domain
      if (domain) {
        try {
          sessionStorage.setItem(`lighthouse:${domain}`, JSON.stringify(data))
        } catch {
          // sessionStorage may be unavailable
        }
        router.push(`/prospects/${encodeURIComponent(domain)}`)
      }
    },
    [router],
  )

  const sorted = [...prospects]
    .sort((a, b) => {
      const scoreA = a.metadata?.deal_score ?? 0
      const scoreB = b.metadata?.deal_score ?? 0
      return scoreB - scoreA
    })
    .slice(0, 12)

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold tracking-tight">
          &#9670; Lighthouse
        </h1>
        <p className="text-muted-foreground">
          Deal qualification for Vercel enterprise sales
        </p>
      </div>

      {/* URL Input */}
      <div className="mx-auto max-w-2xl">
        <UrlInput onAnalysisComplete={handleAnalysisComplete} />
      </div>

      {/* Recent Analyses */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Analyses</h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No analyses yet. Enter a URL above to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((prospect, idx) => (
              <ProspectCard key={prospect.title ?? idx} prospect={prospect} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
