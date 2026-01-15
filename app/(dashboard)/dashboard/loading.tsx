/**
 * Loading State for Dashboard Team View
 * 
 * Displays skeleton placeholders for the 8-slot grid while data is being fetched.
 * 
 * Following React Best Practices:
 * - Static JSX elements hoisted where possible (Best Practice: 6.3)
 * - Minimal re-render surface (skeleton is static UI)
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="mb-2 h-8 w-48 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-5 w-96 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
      </div>

      {/* 8-slot grid skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <TeamSlotSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for a single team slot
 * 
 * Matches the structure and dimensions of the actual TeamSlot component
 * for seamless transition when data loads.
 */
function TeamSlotSkeleton() {
  return (
    <div className="flex h-48 flex-col rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {/* User info skeleton */}
      <div className="mb-3 flex items-center gap-3">
        {/* Avatar skeleton */}
        <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        
        {/* Name and email skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-3 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>

      {/* Task info skeleton */}
      <div className="flex-1 space-y-2">
        {/* Status badge skeleton */}
        <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        
        {/* Task title skeleton (2 lines) */}
        <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        
        {/* Time elapsed skeleton */}
        <div className="h-3 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
