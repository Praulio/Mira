/**
 * Formatea la duración entre dos fechas en formato legible.
 *
 * @param startedAt - Fecha de inicio (cuando la tarea pasó a In Progress)
 * @param completedAt - Fecha de finalización (cuando se completó)
 * @returns String formateado: "2h 30m", "1d 4h", o "-" si no aplica
 *
 * Comportamiento:
 * - Si no hay startedAt → "-"
 * - Si no hay completedAt → calcula desde startedAt hasta ahora (tiempo transcurrido)
 * - Si < 1 hora → muestra solo minutos: "45m"
 * - Si >= 1 hora y < 24 horas → horas y minutos: "2h 30m"
 * - Si >= 24 horas → días y horas: "1d 4h"
 */
export function formatDuration(
  startedAt: Date | string | null | undefined,
  completedAt?: Date | string | null
): string {
  // Sin fecha de inicio, no hay duración que calcular
  if (!startedAt) {
    return "-";
  }

  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const end = completedAt
    ? completedAt instanceof Date
      ? completedAt
      : new Date(completedAt)
    : new Date(); // Si no hay completedAt, usar tiempo actual

  // Calcular diferencia en milisegundos
  const diffMs = end.getTime() - start.getTime();

  // Si la diferencia es negativa o cero, retornar indicador
  if (diffMs <= 0) {
    return "-";
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // >= 24 horas: mostrar días y horas restantes
  if (days >= 1) {
    const remainingHours = hours - days * 24;
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${days}d`;
  }

  // >= 1 hora: mostrar horas y minutos restantes
  if (hours >= 1) {
    const remainingMinutes = minutes - hours * 60;
    if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${hours}h`;
  }

  // < 1 hora: mostrar solo minutos
  if (minutes >= 1) {
    return `${minutes}m`;
  }

  // Menos de 1 minuto
  return "<1m";
}

/**
 * Verifica si una tarea está en progreso (tiene startedAt pero no completedAt)
 */
export function isTaskInProgress(
  startedAt: Date | string | null | undefined,
  completedAt: Date | string | null | undefined
): boolean {
  return !!startedAt && !completedAt;
}
