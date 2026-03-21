import { NextResponse } from "next/server"
import { cortexNodes } from "@/lib/cortex"

export async function GET() {
  const result = await cortexNodes("prospect", 50)
  return NextResponse.json(result)
}
