import { NextRequest, NextResponse } from "next/server"
import { waitUntil } from "@vercel/functions"
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

  // Collect pipeline results for background storage via waitUntil
  let storagePromise: Promise<void> | null = null

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

          // Stage 2+3: Tech stack detection + performance metrics (parallel)
          send("techstack", { status: "running" })
          send("performance", { status: "running" })
          const [techStack, performance] = await Promise.all([
            detectTechStack(html, headers, domain),
            getPerformanceMetrics(url),
          ])
          send("techstack", { status: "complete", data: techStack })
          send("performance", { status: "complete", data: performance })

          // Stage 4: Prospect qualification
          send("qualification", { status: "running" })
          const qualification = await qualifyProspect(
            domain,
            techStack,
            performance
          )
          send("qualification", { status: "complete", data: qualification })

          // Stage 5: Value engineering
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

          // Stage 6: Architecture design
          send("architecture", { status: "running" })
          const architecture = await designArchitecture(
            domain,
            techStack,
            performance,
            valueEngineering
          )
          send("architecture", { status: "complete", data: architecture })

          // Prepare background Cortex storage (runs via waitUntil after stream closes)
          storagePromise = storeInCortex(domain, url, {
            techStack,
            performance,
            qualification,
            valueEngineering,
            architecture,
          })

          // Pipeline complete — send result immediately without waiting on Cortex
          send("complete", {
            domain,
            url,
            techStack,
            performance,
            qualification,
            valueEngineering,
            architecture,
            timestamp: new Date().toISOString(),
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

  const response = new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })

  // Background task: store results in Cortex via Fluid Compute's waitUntil.
  // Runs after the SSE stream closes. The function instance stays alive to
  // complete this work without the user waiting for it.
  if (storagePromise) {
    waitUntil(storagePromise)
  }

  return response
}
