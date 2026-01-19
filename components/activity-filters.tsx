'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'
import type { ActivityFilter } from '@/app/actions/activity'

/**
 * Filter tabs for the activity feed
 *
 * Uses URL params for state to enable:
 * - Shareable filtered links
 * - Browser back/forward navigation
 * - Server-side filtering
 */
export function ActivityFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Get current filter from URL, default to 'all'
  const currentFilter = (searchParams.get('filter') as ActivityFilter) || 'all'

  const filters: { value: ActivityFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'completed', label: 'Completados' },
    { value: 'mentions', label: 'Mis Menciones' },
  ]

  const handleFilterChange = (filter: ActivityFilter) => {
    startTransition(() => {
      // Build new URL with filter param
      const params = new URLSearchParams(searchParams.toString())
      if (filter === 'all') {
        params.delete('filter')
      } else {
        params.set('filter', filter)
      }

      const queryString = params.toString()
      const url = queryString ? `?${queryString}` : '/dashboard/activity'
      router.push(url)
    })
  }

  return (
    <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => handleFilterChange(filter.value)}
          disabled={isPending}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            'disabled:opacity-50',
            currentFilter === filter.value
              ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
              : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
