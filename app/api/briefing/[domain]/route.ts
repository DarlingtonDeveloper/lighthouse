import { NextRequest, NextResponse } from "next/server"
import { cortexBriefing } from "@/lib/cortex"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain: _domain } = await params

  const result = await cortexBriefing("lighthouse", true)

  if (!result) {
    return NextResponse.json({ error: "Briefing unavailable" })
  }

  return NextResponse.json(result)
}
