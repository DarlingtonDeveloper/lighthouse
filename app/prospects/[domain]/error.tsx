'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ProspectError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-6">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred while loading this prospect.'}
      </p>
      <div className="flex items-center justify-center gap-4">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
