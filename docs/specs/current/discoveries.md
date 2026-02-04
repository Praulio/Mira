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

### Session 5 - 2026-02-04
**Task:** 3.2 - Cambiar TeamSlotData de singular a array
**Files:**
- `app/actions/team.ts:11-26` (tipo TeamSlotData)
- `app/actions/team.ts:62-91` (query getTeamViewData)
- `components/team-slot.tsx:28-33` (adaptación temporal)

**Cambios realizados:**
1. Tipo `inProgressTask` (singular, nullable) → `inProgressTasks` (array)
2. Shape ampliado con `startedAt` y `blockerReason`
3. Query: eliminado `.limit(1)`, agregado `orderBy(desc(tasks.startedAt))`
4. Select: agregados `startedAt` y `blockerReason`
5. TeamSlot: adaptación temporal `const inProgressTask = inProgressTasks[0] || null` con TODO(7.1)

**Patterns descubiertos:**
- Al hacer breaking changes en tipos, agregar adaptación temporal en consumidores para mantener build verde
- El TODO con referencia a tarea futura (7.1) sirve como reminder para siguiente sesión
- `startedAt` es preferible a `updatedAt` para calcular tiempo transcurrido (más preciso)

**Notes:** Build pasa. Siguiente: 4.1 agregar variables CSS para blocker.

### Session 6 - 2026-02-04
**Task:** 4.1 - Agregar variables CSS para blocker
**Files:** `app/globals.css:77-81`
**Patterns:**
- OKLCH usa hue ~30 para naranja (entre rojo 25 y amarillo 80)
- Patrón de 4 variables por status: base, bg (con alpha), glow (con alpha), border (con alpha)
- Las variables se agregan junto a otras de status para mantener organización semántica
**Notes:** Build pasa. Siguiente: 5.1 agregar visualización de blocker en TaskCard.

### Session 7 - 2026-02-04
**Task:** 5.1 - Agregar visualización de blocker en TaskCard
**Files:** `components/task-card.tsx`
**Cambios realizados:**
1. Importado `AlertTriangle` de lucide-react
2. Agregado badge naranja "Bloqueada" después del título cuando `task.blockerReason` existe
3. Agregada caja con razón del bloqueo (max 2 líneas con `line-clamp-2`)
4. Variable `isBlocked = !!task.blockerReason` para controlar estilos
5. `cardStyle` ahora usa `--border-blocked` y `--glow-blocked` cuando bloqueada
6. Handlers `onMouseEnter/onMouseLeave` actualizados para mantener estilo naranja

**Patterns descubiertos:**
- El componente usa inline styles para estados dinámicos (hover, drag, blocked)
- Variables CSS se referencian con `var(--nombre)` directamente en objetos JS
- El patrón de badge usa: `bg-[var(--status-blocked-bg)]` + `text-[var(--status-blocked)]`
- `line-clamp-2` de Tailwind limita texto a 2 líneas con ellipsis

**Notes:** Build pasa. Siguiente: 6.1 agregar sección Blocker en TaskDetailDialog.

### Session 8 - 2026-02-04
**Task:** 6.1 - Agregar sección Blocker en TaskDetailDialog
**Files:** `components/task-detail-dialog.tsx`

**Cambios realizados:**
1. Importados `AlertTriangle` y `Loader2` de lucide-react
2. Importados `addBlocker` y `removeBlocker` de tasks actions
3. Agregados estados: `blockerReason`, `isAddingBlocker`, `isRemovingBlocker`
4. Agregadas funciones: `handleAddBlocker()` y `handleRemoveBlocker()`
5. Agregada sección UI "Blocker" con 3 estados visuales:
   - Con blocker: muestra razón + botón remover (solo owners)
   - Sin blocker (owner): textarea + botón "Marcar como bloqueada"
   - Sin blocker (no owner): texto "Sin blocker activo"
6. Sección solo visible para tareas no completadas (!isDone)

**Patterns descubiertos:**
- El componente usa `isOwner` (línea 62) que ya verifica assignee OR creator - reutilizado para permisos de blocker
- Variables CSS de blocker (`--status-blocked`, `--border-blocked`, etc.) se aplican con `var()` en clases de Tailwind
- Patrón de form con contador de caracteres: `{value.length}/maxLength`
- Textarea con `resize-none` para mantener diseño compacto

**Notes:** Build pasa. Siguiente: 7.1 actualizar TeamSlot para array de tareas.
