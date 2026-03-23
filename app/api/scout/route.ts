import { NextRequest, NextResponse } from "next/server"
import { isValidPublicUrl } from "@/lib/utils"
import { runScout } from "@/lib/scout/pipeline"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { urls, tier3_limit, skip_vercel, skip_tier3 } = body

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json(
      { error: "urls must be a non-empty array of strings" },
      { status: 400 }
    )
  }

  if (urls.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 URLs per scan" },
      { status: 400 }
    )
  }

  // Validate each URL is a string
  for (const url of urls) {
    if (typeof url !== "string" || url.trim().length === 0) {
      return NextResponse.json(
        { error: `Invalid URL in list: ${url}` },
        { status: 400 }
      )
    }
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      ;(async () => {
        try {
          for await (const event of runScout(urls, {
            tier3_limit: tier3_limit ?? 5,
            skip_vercel: skip_vercel ?? true,
            skip_tier3: skip_tier3 ?? false,
          })) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                stage: "error",
                data: {
                  message:
                    error instanceof Error
                      ? error.message
                      : "An unknown error occurred",
                },
              })}\n\n`
            )
          )
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
