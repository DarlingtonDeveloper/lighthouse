import Link from 'next/link'
import { cortexSearch, cortexNodes } from '@/lib/cortex'
import { entityTag } from '@/lib/utils'
import { DashboardContent } from './dashboard-content'

import type { TechStack, Qualification, ValueEngineering, Architecture } from '@/lib/schemas'
import type { PerformanceMetrics } from '@/lib/pagespeed'

interface ProspectData {
  domain: string
  qualification: Qualification | null
  techStack: TechStack | null
  performance: PerformanceMetrics | null
  valueEngineering: ValueEngineering | null
  architecture: Architecture | null
}

function safeParse<T>(body: string | undefined | null): T | null {
  if (!body) return null
  try {
    return JSON.parse(body) as T
  } catch {
    return null
  }
}

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params
  const decodedDomain = decodeURIComponent(domain)

  const tag = entityTag(decodedDomain)

  // Fetch nodes from multiple sources to ensure all kinds are captured.
  // Semantic search alone can miss node types that don't match the query well.
  const [searchResults, ...kindResults] = await Promise.all([
    cortexSearch(decodedDomain, 50),
    cortexNodes("stack-detection", 50),
    cortexNodes("performance-snapshot", 50),
    cortexNodes("qualification-score", 50),
    cortexNodes("value-proposition", 50),
    cortexNodes("poc-scope", 50),
    cortexNodes("prospect", 50),
  ])

  // Merge all nodes, deduplicate by id, filter by entity tag
  const allNodes = [
    ...searchResults.results,
    ...kindResults.flatMap((r) => r.nodes),
  ]
  const seen = new Set<string>()
  const filtered = allNodes.filter((node: any) => {
    const id = node.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return node.tags?.includes(tag)
  })

  if (filtered.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">No analysis found for this domain</h1>
        <p className="text-muted-foreground">
          {decodedDomain} has not been analysed yet.
        </p>
        <Link
          href="/"
          className="inline-block text-sm text-blue-400 underline underline-offset-2 hover:text-blue-300"
        >
          Back to home
        </Link>
      </div>
    )
  }

  // Group by kind
  const grouped: Record<string, any[]> = {}
  for (const node of filtered) {
    const kind = (node.kind as string).toLowerCase()
    if (!grouped[kind]) grouped[kind] = []
    grouped[kind].push(node)
  }

  // Parse stored JSON bodies back into typed objects
  const prospectNode = grouped['prospect']?.[0] ?? null
  const qualificationNode = grouped['qualification-score']?.[0] ?? null
  const techStackNode = grouped['stack-detection']?.[0] ?? null
  const performanceNode = grouped['performance-snapshot']?.[0] ?? null
  const valueNode = grouped['value-proposition']?.[0] ?? null
  const architectureNode = grouped['poc-scope']?.[0] ?? null

  const data: ProspectData = {
    domain: decodedDomain,
    qualification: safeParse<Qualification>(qualificationNode?.body),
    techStack: safeParse<TechStack>(techStackNode?.body),
    performance: safeParse<PerformanceMetrics>(performanceNode?.body),
    valueEngineering: safeParse<ValueEngineering>(valueNode?.body),
    architecture: safeParse<Architecture>(architectureNode?.body),
  }

  const prospectBody = safeParse<any>(prospectNode?.body)
  const dealScore = data.qualification?.deal_score ?? prospectBody?.deal_score ?? null
  const recommendedAction = data.qualification?.recommended_action ?? prospectBody?.recommended_action ?? null

  return (
    <DashboardContent
      domain={decodedDomain}
      dealScore={dealScore}
      recommendedAction={recommendedAction}
      qualification={data.qualification}
      techStack={data.techStack}
      performance={data.performance}
      valueEngineering={data.valueEngineering}
      architecture={data.architecture}
    />
  )
}
