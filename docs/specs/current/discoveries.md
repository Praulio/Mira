# Discoveries: Blockers + Multi-Actividad

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Descubiertos

(Se llena durante la implementación)

---

## Archivos Clave de Referencia

- **Schema BD:** `db/schema.ts:54-79` - Definición de tabla tasks
- **Server Actions:** `app/actions/tasks.ts` - Patrón de transacción + actividad
- **Kanban Types:** `app/actions/kanban.ts:33` - KanbanTaskData
- **Team Types:** `app/actions/team.ts` - TeamSlotData y getTeamViewData
- **TaskCard:** `components/task-card.tsx` - Visualización de tareas
- **TeamSlot:** `components/team-slot.tsx` - Slot de usuario en dashboard
- **CreateTaskDialog:** `components/create-task-dialog.tsx:21-116` - Patrón de adjuntos
- **CompleteTaskModal:** `components/complete-task-modal.tsx` - Modal de completar
- **CSS Variables:** `app/globals.css:76` - Variables de status

---

## Sesiones

### Session 0 - 2026-02-04

**Setup inicial**
- Implementation plan generado con 11 tareas en 9 fases
- Archivos de ejecución creados en `docs/specs/current/`
- Listo para `./ralph-loop.sh`

**Decisiones del usuario:**
- Permisos blocker: Assignee o Creator
- Movimiento tarea bloqueada: Permitido libremente
- Tareas en TeamSlot: Máximo 2, luego "+N más"
- Límite in_progress: Sin límite

### Session 1 - 2026-02-04
**Task:** 0.1 - Agregar campo blockerReason al schema
**Files:** `db/schema.ts:70`
**Patterns:** Campo ya existía (pre-migrado). El patrón de campo nullable `text` es preferible a tabla separada para relaciones 1:1 simples.
**Notes:** Build pasa, tarea 0.1 completada. Siguiente: 1.1 eliminar restricción Single In-Progress.

### Session 2 - 2026-02-04
**Task:** 1.1 - Eliminar restricción Single In-Progress
**Files:** `app/actions/tasks.ts`
**Patterns:** La restricción estaba en DOS lugares:
1. `updateTaskStatus()` líneas 309-326 - bloque que movía otras tareas a 'todo'
2. `assignTask()` líneas 668-681 - mismo comportamiento al asignar

**Cambios realizados:**
- Eliminado bloque condicional en `updateTaskStatus()` que demotaba otras tareas
- Eliminado bloque condicional en `assignTask()` con mismo comportamiento
- Actualizados docstrings para reflejar "Multi-Activity mode"
- MANTENIDO: lógica de `startedAt` para time tracking (cada tarea tiene su propio timestamp)

**Notes:** Build pasa. Los usuarios ahora pueden tener múltiples tareas "En Progreso" simultáneamente.

### Session 3 - 2026-02-04
**Task:** 2.1 + 2.2 - Agregar actions addBlocker y removeBlocker
**Files:** `app/actions/tasks.ts:93-110` (schemas), `app/actions/tasks.ts:1417-1620` (functions)

**Patterns descubiertos:**
1. El patrón de permisos `assignee OR creator` es consistente en el proyecto para acciones de ownership
2. Se reutiliza `action: 'updated'` con `fieldUpdated: 'blockerReason'` en metadata para mantener consistencia con otros updates (progress, dueDate, completedAt)
3. La validación de que la tarea ya tenga blocker antes de removerlo previene operaciones innecesarias

**Cambios realizados:**
- Agregados schemas Zod `addBlockerSchema` y `removeBlockerSchema`
- Agregada función `addBlocker()` - verifica ownership, actualiza blockerReason, registra actividad
- Agregada función `removeBlocker()` - verifica ownership, verifica que exista blocker, limpia blockerReason

**Notes:** Build pasa. Siguiente: 3.1 agregar blockerReason a KanbanTaskData.

### Session 4 - 2026-02-04
**Task:** 3.1 - Agregar blockerReason a KanbanTaskData
**Files:** `app/actions/kanban.ts:34` (tipo), `app/actions/kanban.ts:88` (query), `app/actions/kanban.ts:130` (objeto retorno)
**Patterns:**
- Al agregar campo nuevo a query de Drizzle, actualizar 3 lugares: tipo → select → objeto retorno
- El campo viene de `tasks.blockerReason` del schema ya migrado
**Notes:** Build pasa. Siguiente: 3.2 cambiar TeamSlotData de singular a array.
