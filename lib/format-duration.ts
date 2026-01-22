/**
 * Formats the duration between two dates into a human-readable string.
 *
 * @param startedAt - The start timestamp
 * @param completedAt - The end timestamp
 * @returns Formatted duration string (e.g., "2h 30m", "1d 4h", "45m")
 *
 * Rules:
 * - If startedAt is null/undefined, returns "-"
 * - If duration > 24h, shows days (e.g., "1d 4h")
 * - If duration < 1h, shows only minutes (e.g., "45m")
 * - Otherwise shows hours and minutes (e.g., "2h 30m")
 */
export function formatDuration(
  startedAt: Date | string | null | undefined,
  completedAt: Date | string | null | undefined
): string {
  if (!startedAt) {
    return '-'
  }

  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt
  const end = completedAt
    ? typeof completedAt === 'string'
      ? new Date(completedAt)
      : completedAt
    : new Date()

  const diffMs = end.getTime() - start.getTime()

  if (diffMs < 0) {
    return '-'
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  const minutes = totalMinutes % 60
  const hours = totalHours % 24

  if (totalDays > 0) {
    if (hours > 0) {
      return `${totalDays}d ${hours}h`
    }
    return `${totalDays}d`
  }

  if (totalHours > 0) {
    if (minutes > 0) {
      return `${totalHours}h ${minutes}m`
    }
    return `${totalHours}h`
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}m`
  }

  return '< 1m'
}

/**
 * Calculates the duration in milliseconds between two dates.
 *
 * @param startedAt - The start timestamp
 * @param completedAt - The end timestamp (defaults to now if not provided)
 * @returns Duration in milliseconds, or 0 if startedAt is null
 */
export function getDurationMs(
  startedAt: Date | string | null | undefined,
  completedAt: Date | string | null | undefined
): number {
  if (!startedAt) {
    return 0
  }

  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt
  const end = completedAt
    ? typeof completedAt === 'string'
      ? new Date(completedAt)
      : completedAt
    : new Date()

  return Math.max(0, end.getTime() - start.getTime())
}
