import { NextRequest, NextResponse } from "next/server"
import { cortexSearch } from "@/lib/cortex"
import { entityTag } from "@/lib/utils"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params

  const tag = entityTag(domain)
  const { results } = await cortexSearch(domain, 30)

  const filtered = results.filter(
    (node: { tags?: string[] }) => node.tags?.includes(tag)
  )

  const grouped: Record<string, any[]> = {}
  for (const node of filtered) {
    const kind = node.kind as string
    if (!grouped[kind]) {
      grouped[kind] = []
    }
    grouped[kind].push(node)
  }

  return NextResponse.json({
    domain,
    prospect: grouped["prospect"]?.[0] ?? null,
    tech_stack: grouped["stack-detection"]?.[0] ?? null,
    performance: grouped["performance-snapshot"]?.[0] ?? null,
    qualification: grouped["qualification-score"]?.[0] ?? null,
    value_proposition: grouped["value-proposition"]?.[0] ?? null,
    architecture: grouped["poc-scope"]?.[0] ?? null,
    case_study_match: grouped["case-study-match"]?.[0] ?? null,
    migration_steps: grouped["migration-pattern"] ?? [],
  })
}
