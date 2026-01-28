/**
 * Formatea una fecha como tiempo relativo en español.
 *
 * @param date - Fecha a formatear
 * @returns String formateado: "ahora", "hace 5m", "hace 2h", "hace 3d", o fecha corta si > 7 días
 */
export function formatRelativeTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 0) {
    return "ahora";
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return "ahora";
  }

  if (minutes < 60) {
    return `hace ${minutes}m`;
  }

  if (hours < 24) {
    return `hace ${hours}h`;
  }

  if (days < 7) {
    return `hace ${days}d`;
  }

  // > 7 días: fecha corta
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}
