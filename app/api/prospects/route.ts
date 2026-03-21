import { NextResponse } from "next/server"
import { cortexNodes } from "@/lib/cortex"

export async function GET() {
  const result = await cortexNodes("prospect", 50)

  // Parse JSON body into structured data for the frontend
  const nodes = result.nodes.map((node: any) => {
    let parsed: Record<string, any> = {}
    try {
      parsed = JSON.parse(node.body)
    } catch {
      // body isn't JSON — use as-is
    }
    return {
      ...node,
      // Surface key fields so ProspectCard can read them directly
      metadata: {
        domain: parsed.domain ?? node.title?.replace("Prospect analysis: ", ""),
        deal_score: parsed.deal_score,
        vercel_fit: parsed.vercel_fit,
        traffic_tier: parsed.traffic_tier,
        industry: parsed.industry,
        recommended_action: parsed.recommended_action,
        framework: parsed.framework,
        hosting: parsed.hosting,
        url: parsed.url,
      },
    }
  })

  return NextResponse.json({ nodes })
}
