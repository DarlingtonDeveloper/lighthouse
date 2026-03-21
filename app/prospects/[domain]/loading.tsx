import { Skeleton } from '@/components/ui/skeleton'

export default function ProspectLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>

      {/* Row 1: Two panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>

      {/* Row 2: Two panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>

      {/* Full width: Architecture */}
      <Skeleton className="h-64 rounded-xl" />

      {/* Full width: Talking Points */}
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
