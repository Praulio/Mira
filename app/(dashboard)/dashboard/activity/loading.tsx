/**
 * Loading skeleton for Activity Feed
 * 
 * Best Practice 6.3: Static JSX hoisted for performance
 */
export default function ActivityLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
      </div>

      {/* Activity items skeleton */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {Array.from({ length: 10 }).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for a single activity item
 */
function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4">
      {/* Icon skeleton */}
      <div className="mt-1 h-8 w-8 shrink-0 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {/* Avatar skeleton */}
          <div className="h-5 w-5 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
          
          {/* Message skeleton */}
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
        
        {/* Timestamp skeleton */}
        <div className="h-3 w-20 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
      </div>
    </div>
  )
}
