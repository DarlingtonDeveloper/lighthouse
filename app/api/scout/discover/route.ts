import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

const DiscoverSchema = z.object({
  companies: z.array(
    z.object({
      name: z.string().describe("Company name"),
      url: z
        .string()
        .describe("Company website URL including https://"),
      reason: z
        .string()
        .describe(
          "One sentence: why this company is relevant to the query"
        ),
    })
  ),
})

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { query } = body
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 400 }
    )
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: DiscoverSchema,
      prompt: `You are a Vercel enterprise sales researcher. Given a territory query, return a list of real companies with their actual website URLs.

QUERY: "${query.trim()}"

RULES:
- Return 20-30 companies that match the query.
- Every URL must be a real, publicly accessible website. Use https://.
- Use the company's primary marketing/product website, not social media or app store links.
- Focus on companies that are likely to have a web presence worth analysing (e-commerce sites, SaaS products, media sites, etc.).
- Prioritise companies that might benefit from a modern frontend platform (large sites with traffic, not tiny brochure sites).
- Include a mix of well-known and mid-market companies, not just the top 5 everyone knows.
- The reason should explain why this company matches the query in one sentence.
- Do NOT make up companies or URLs. Only include companies you are confident exist with the URL you provide.
- Do NOT include companies that are primarily API-only or have no public website.`,
    })

    return NextResponse.json({ companies: object.companies })
  } catch (error) {
    console.error("Scout discover failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Discovery failed",
      },
      { status: 500 }
    )
  }
}
