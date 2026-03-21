"use client"

import { useEffect, useRef, useCallback } from "react"
import type { Architecture } from "@/lib/schemas"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ArchitecturePanelProps {
  data: Architecture
}

function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const renderedRef = useRef(false)

  const renderDiagram = useCallback(async () => {
    if (!containerRef.current || renderedRef.current || !chart) return
    renderedRef.current = true

    try {
      const mermaid = (await import("mermaid")).default
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#1e293b",
          primaryTextColor: "#e2e8f0",
          primaryBorderColor: "#475569",
          lineColor: "#64748b",
          secondaryColor: "#0f172a",
          tertiaryColor: "#1e293b",
        },
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
      })

      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
      const { svg } = await mermaid.render(id, chart)
      if (containerRef.current) {
        containerRef.current.innerHTML = svg
      }
    } catch {
      // Render failed — show raw code
      if (containerRef.current) {
        const pre = document.createElement("pre")
        pre.className = "text-xs leading-relaxed"
        const code = document.createElement("code")
        code.textContent = chart
        pre.appendChild(code)
        containerRef.current.innerHTML = ""
        containerRef.current.appendChild(pre)
      }
    }
  }, [chart])

  useEffect(() => {
    renderedRef.current = false
    renderDiagram()
  }, [renderDiagram])

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto rounded-md border border-border/50 bg-muted/30 p-3"
    >
      <pre className="text-xs leading-relaxed">
        <code>{chart}</code>
      </pre>
    </div>
  )
}

export function ArchitecturePanel({ data }: ArchitecturePanelProps) {
  const currentArch = data?.current_architecture
  const targetArch = data?.target_architecture
  const poc = data?.poc_proposal

  return (
    <Card>
      <CardHeader>
        <CardTitle>Architecture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Current & Target side by side on large screens */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Current State */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Current State</h3>

            {currentArch?.mermaid_diagram && (
              <MermaidDiagram chart={currentArch.mermaid_diagram} />
            )}

            {currentArch?.description && (
              <p className="text-xs text-muted-foreground">
                {currentArch.description}
              </p>
            )}

            {currentArch?.pain_points &&
              currentArch.pain_points.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Pain Points
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                    {currentArch.pain_points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          {/* Target State */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Target State</h3>

            {targetArch?.mermaid_diagram && (
              <MermaidDiagram chart={targetArch.mermaid_diagram} />
            )}

            {targetArch?.description && (
              <p className="text-xs text-muted-foreground">
                {targetArch.description}
              </p>
            )}

            {/* Key Changes Table */}
            {targetArch?.key_changes &&
              targetArch.key_changes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Key Changes
                  </p>
                  <div className="overflow-x-auto rounded-md border border-border/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                            Component
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                            From
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                            To
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                            Benefit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {targetArch.key_changes.map((change, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="px-3 py-1.5 font-medium">
                              {change.component ?? "N/A"}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {change.from ?? "N/A"}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {change.to ?? "N/A"}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {change.benefit ?? "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* PoC Proposal */}
        {poc && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">PoC Proposal</h3>

            <div className="space-y-3 rounded-md border border-border/50 px-4 py-3">
              {poc.title && (
                <p className="text-sm font-medium">{poc.title}</p>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {poc.scope && (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Scope
                    </p>
                    <p className="text-xs">{poc.scope}</p>
                  </div>
                )}
                {poc.approach && (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Approach
                    </p>
                    <p className="text-xs">{poc.approach}</p>
                  </div>
                )}
                {poc.duration && (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Duration
                    </p>
                    <p className="text-xs">{poc.duration}</p>
                  </div>
                )}
              </div>

              {/* Success Criteria Table */}
              {poc.success_criteria && poc.success_criteria.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Success Criteria
                  </p>
                  <div className="overflow-x-auto rounded-md border border-border/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                            Metric
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                            Current
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                            Target
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {poc.success_criteria.map((criteria, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="px-3 py-1.5 font-medium">
                              {criteria.metric ?? "N/A"}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {criteria.current_value ?? "N/A"}
                            </td>
                            <td className="px-3 py-1.5 text-emerald-400">
                              {criteria.target_value ?? "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Required from Prospect */}
              {poc.required_from_prospect &&
                poc.required_from_prospect.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Required from Prospect
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                      {poc.required_from_prospect.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Risk Mitigation */}
              {poc.risk_mitigation && (
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Risk Mitigation
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {poc.risk_mitigation}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
