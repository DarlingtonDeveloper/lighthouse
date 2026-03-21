import { NextRequest, NextResponse } from "next/server"
import { extractDomain, isValidPublicUrl } from "@/lib/utils"
import { fetchPage } from "@/lib/fetcher"
import { getPerformanceMetrics } from "@/lib/pagespeed"
import {
  detectTechStack,
  qualifyProspect,
  engineerValue,
  designArchitecture,
} from "@/lib/gemini"
import { cortexSearchPriorPatterns } from "@/lib/cortex"
import { storeInCortex } from "@/lib/cortex-store-pipeline"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  const domain = extractDomain(url)

  if (!isValidPublicUrl(url)) {
    return NextResponse.json(
      { error: "Invalid or non-public URL. Please provide a valid HTTPS URL." },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (stage: string, data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ stage, data })}\n\n`)
        )
      }

      ;(async () => {
        try {
          // Stage 1: Fetch page
          send("fetch", { status: "running" })
          const { html, headers } = await fetchPage(url)
          send("fetch", { status: "complete" })

          // Stage 2: Tech stack detection + performance metrics (parallel)
          send("techstack", { status: "running" })
          send("performance", { status: "running" })
          const [techStack, performance] = await Promise.all([
            detectTechStack(html, headers, domain),
            getPerformanceMetrics(url),
          ])
          send("techstack", { status: "complete", data: techStack })
          send("performance", { status: "complete", data: performance })

          // Stage 3: Prospect qualification
          send("qualification", { status: "running" })
          const qualification = await qualifyProspect(
            domain,
            techStack,
            performance
          )
          send("qualification", { status: "complete", data: qualification })

          // Stage 4: Value engineering
          send("value", { status: "running" })
          const priorPatterns = await cortexSearchPriorPatterns(techStack)
          const valueEngineering = await engineerValue(
            domain,
            techStack,
            performance,
            qualification,
            priorPatterns
          )
          send("value", { status: "complete", data: valueEngineering })

          // Stage 5: Architecture design
          send("architecture", { status: "running" })
          const architecture = await designArchitecture(
            domain,
            techStack,
            performance,
            valueEngineering
          )
          send("architecture", { status: "complete", data: architecture })

          // Stage 6: Store in Cortex
          send("storage", { status: "running" })
          await storeInCortex(domain, url, {
            techStack,
            performance,
            qualification,
            valueEngineering,
            architecture,
          })
          send("storage", { status: "complete" })

          // Pipeline complete
          send("complete", {
            domain,
            techStack,
            performance,
            qualification,
            valueEngineering,
            architecture,
          })
        } catch (error) {
          send("error", {
            message:
              error instanceof Error ? error.message : "An unknown error occurred",
          })
        } finally {
          controller.close()
        }
      })()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
