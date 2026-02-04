---
title: "feat: Sistema de Blockers + Multi-Actividad"
type: feat
date: 2026-02-04
---

# feat: Sistema de Blockers + Multi-Actividad

## Overview

Implementar 3 features interrelacionadas que mejoran la gestión de tareas en Mira:

1. **Sistema de Blockers** - Marcar tareas como bloqueadas con razón visible (cualquier columna)
2. **Múltiples Actividades en Progreso** - Eliminar restricción de 1 tarea in_progress por usuario
3. **Dashboard Multi-Actividad** - Mostrar múltiples tareas activas por usuario en TeamSlot
4. **Adjuntos al Completar Tarea** - Agregar archivos al completar una tarea (como en CreateTaskDialog)

## Problem Statement / Motivation

**Problema actual:**
- Solo se permite 1 tarea "En Progreso" por usuario (auto-demote de otras)
- No hay forma de marcar una tarea como "bloqueada" con razón visible
- TeamSlot solo muestra 1 tarea, ocultando el trabajo real del usuario

**Impacto:**
- Usuarios no pueden reflejar trabajo paralelo real
- Bloqueos se comunican fuera del sistema (Slack, reuniones)
- Dashboard no refleja carga de trabajo real del equipo
- Al completar tareas no se pueden adjuntar archivos de soporte (solo links)

## Decisions Made

| Decisión | Respuesta |
|----------|-----------|
| Permisos de blocker | Assignee o Creator pueden agregar/quitar |
| Movimiento de tarea bloqueada | Permitido libremente (blocker es visual) |
| Tareas en TeamSlot | Máximo 2 visibles, luego "+N más" |
| Límite de in_progress | Sin límite |

---

## Technical Approach

### Fase 1: Migración de Base de Datos

**Archivo:** `db/schema.ts`

Agregar campo después de `progress` (línea 69):

```typescript
// db/schema.ts:70
blockerReason: text('blocker_reason'), // NULL = no bloqueada, string = razón
```

**Migración SQL generada:**
```sql
ALTER TABLE "tasks" ADD COLUMN "blocker_reason" text;
```

**Comando:**
```bash
npx drizzle-kit generate && npx drizzle-kit push
```

---

### Fase 2: Backend - Acciones de Servidor

**Archivo:** `app/actions/tasks.ts`

#### 2.1 Agregar Schemas Zod

```typescript
// app/actions/tasks.ts (después de otros schemas ~línea 85)
const addBlockerSchema = z.object({
  taskId: z.string().uuid('ID de tarea inválido'),
  reason: z.string().min(1, 'La razón es requerida').max(500, 'Máximo 500 caracteres'),
});

const removeBlockerSchema = z.object({
  taskId: z.string().uuid('ID de tarea inválido'),
});
```

#### 2.2 Nueva Acción: addBlocker

```typescript
/**
 * Server Action: Add a blocker to a task
 *
 * Only the assignee or creator can add a blocker.
 * Blocked tasks can still be moved between columns (visual indicator only).
 */
export async function addBlocker(
  input: z.infer<typeof addBlockerSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  // 1. Auth check
  // 2. Validate input
  // 3. Verify user is assignee or creator
  // 4. Update blockerReason
  // 5. Log activity with action: 'updated', metadata: { blocked: true, reason }
  // 6. Revalidate paths
}
```

#### 2.3 Nueva Acción: removeBlocker

```typescript
/**
 * Server Action: Remove a blocker from a task
 *
 * Only the assignee or creator can remove a blocker.
 */
export async function removeBlocker(
  input: z.infer<typeof removeBlockerSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  // 1. Auth check
  // 2. Validate input
  // 3. Verify user is assignee or creator
  // 4. Set blockerReason = null
  // 5. Log activity with action: 'updated', metadata: { blocked: false }
  // 6. Revalidate paths
}
```

#### 2.4 Eliminar Restricción Single In-Progress

**ELIMINAR** bloque en `updateTaskStatus()` (líneas 286-303):

```typescript
// ❌ ELIMINAR ESTE BLOQUE COMPLETO:
if (newStatus === 'in_progress' && currentTask.assigneeId) {
  await tx
    .update(tasks)
    .set({
      status: 'todo',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.assigneeId, currentTask.assigneeId),
        eq(tasks.status, 'in_progress'),
      )
    );
}
```

**MANTENER** la lógica de `startedAt` (líneas 314-318) - necesaria para time tracking.

---

### Fase 3: Actualizar Tipos y Queries

#### 3.1 KanbanTaskData

**Archivo:** `app/actions/kanban.ts`

```typescript
// Agregar a KanbanTaskData type (~línea 33)
blockerReason: string | null;

// Agregar a query select (~línea 85)
blockerReason: tasks.blockerReason,

// Agregar a objeto de retorno (~línea 128)
blockerReason: task.blockerReason,
```

#### 3.2 TeamSlotData (cambio de singular a array)

**Archivo:** `app/actions/team.ts`

```typescript
// ANTES
export type TeamSlotData = {
  user: { ... };
  inProgressTask: { ... } | null;  // singular
};

// DESPUÉS
export type TeamSlotData = {
  user: { ... };
  inProgressTasks: Array<{         // array
    id: string;
    title: string;
    description: string | null;
    updatedAt: Date;
    startedAt: Date | null;
    progress: number;
    blockerReason: string | null;  // nuevo campo
  }>;
};
```

**Actualizar `getTeamViewData()`:**
- Quitar `.limit(1)` de la query
- Agregar `blockerReason` al select
- Ordenar por `startedAt` DESC (más reciente primero)

---

### Fase 4: UI - Visualización de Blockers

#### 4.1 Variables CSS

**Archivo:** `app/globals.css`

```css
/* Blocker Status Colors (agregar después de línea 76) */
--status-blocked: oklch(0.60 0.25 30);
--status-blocked-bg: oklch(0.60 0.25 30 / 0.15);
--glow-blocked: oklch(0.60 0.25 30 / 0.4);
--border-blocked: oklch(0.60 0.25 30 / 0.6);
```

#### 4.2 TaskCard

**Archivo:** `components/task-card.tsx`

Cambios:
1. Importar `AlertTriangle` de lucide-react
2. Detectar `isBlocked = !!task.blockerReason`
3. Agregar badge naranja "Bloqueada" cuando bloqueada
4. Mostrar razón del bloqueo (max 2 líneas)
5. Borde y glow naranja para tareas bloqueadas

```tsx
{/* Badge de blocker - después del título */}
{task.blockerReason && (
  <div className="mb-2 flex items-center gap-1.5 rounded-full bg-orange-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-400">
    <AlertTriangle className="h-3 w-3" />
    <span>Bloqueada</span>
  </div>
)}

{/* Razón del bloqueo */}
{task.blockerReason && (
  <p className="mb-3 line-clamp-2 text-xs text-orange-300/80 bg-orange-500/10 rounded-lg p-2 border border-orange-500/20">
    {task.blockerReason}
  </p>
)}
```

#### 4.3 TaskDetailDialog

**Archivo:** `components/task-detail-dialog.tsx`

Agregar sección "Blocker" con:
- Input para escribir razón
- Botón "Agregar Blocker" (naranja)
- Vista de blocker existente con botón X para quitar
- Estilos naranja consistentes

---

### Fase 5: Dashboard Multi-Actividad

#### 5.1 TeamSlot

**Archivo:** `components/team-slot.tsx`

**Cambios:**

1. Actualizar props para usar `inProgressTasks` (array)
2. Badge con cantidad cuando hay 2+ tareas
3. Icono AlertTriangle si alguna está bloqueada
4. Vista condicional:
   - **0 tareas:** "Inactivo • Sin tarea asignada"
   - **1 tarea:** Mostrar como actualmente
   - **2+ tareas:** Lista compacta (max 2 visibles + "+N más")

```tsx
// Vista multi-tarea (2+)
function MultiTaskView({ tasks }: { tasks: InProgressTask[] }) {
  return (
    <div className="space-y-1.5">
      {tasks.slice(0, 2).map((task) => (
        <div key={task.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] ${
          task.blockerReason ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-white/5'
        }`}>
          {task.blockerReason && <AlertTriangle className="h-2.5 w-2.5 text-orange-400" />}
          <span className="truncate flex-1 font-medium">{task.title}</span>
          <span className="text-muted-foreground/60">{getTimeElapsed(task.startedAt)}</span>
        </div>
      ))}
      {tasks.length > 2 && (
        <div className="text-center text-[9px] text-muted-foreground/50">
          +{tasks.length - 2} más
        </div>
      )}
    </div>
  );
}
```

---

### Fase 6: Adjuntos en CompleteTaskModal

**Archivo:** `components/complete-task-modal.tsx`

Esta feature replica el patrón de adjuntos de `CreateTaskDialog` en el modal de completar tarea.

#### 6.1 Importaciones Adicionales

```typescript
// complete-task-modal.tsx (agregar a imports existentes)
import { Paperclip, Loader2 } from 'lucide-react';
import { PendingFilePicker } from '@/components/pending-file-picker';
```

#### 6.2 Nuevos Estados

```typescript
// Dentro de CompleteTaskModalInner
const [pendingFiles, setPendingFiles] = useState<File[]>([]);
const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
```

#### 6.3 Lógica de Upload (después de completeTask)

```typescript
const handleComplete = async () => {
  setIsSubmitting(true);

  const mentionIds = extractMentionIds(notes);
  const result = await completeTask({
    taskId: task.id,
    notes: notes.trim() || undefined,
    links: links.length > 0 ? links : undefined,
    mentions: mentionIds.length > 0 ? mentionIds : undefined,
  });

  if (result.success) {
    // Upload pending files if any
    if (pendingFiles.length > 0) {
      setUploadProgress({ current: 0, total: pendingFiles.length });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        setUploadProgress({ current: i + 1, total: pendingFiles.length });

        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('taskId', task.id);

          const response = await fetch('/api/attachments/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          const uploadResult = await response.json();
          if (uploadResult.success) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }

      setUploadProgress(null);

      // Show appropriate toast
      if (errorCount > 0 && successCount > 0) {
        toast.warning(`¡Tarea completada! ${successCount} archivo(s) subido(s), ${errorCount} fallido(s).`);
      } else if (errorCount > 0) {
        toast.warning('Tarea completada, pero los archivos no se pudieron subir.');
      } else {
        // Celebration with attachments
        fireConfetti();
        playCelebrationSound();
        toast.success('¡Tarea completada con adjuntos!');
      }
    } else {
      // Normal celebration
      fireConfetti();
      playCelebrationSound();
      toast.success('¡Tarea completada!');
    }

    router.refresh();
    onClose();
    onComplete?.();
  } else {
    toast.error(result.error || 'Error al completar la tarea');
    setIsSubmitting(false);
  }
};
```

#### 6.4 UI - Sección de Adjuntos

Agregar después de la sección de Links:

```tsx
{/* Attachments Section */}
<div className="space-y-2">
  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
    <Paperclip className="h-3 w-3" /> Adjuntar archivos (opcional)
  </label>
  <PendingFilePicker
    files={pendingFiles}
    onFilesChange={setPendingFiles}
    disabled={isSubmitting}
  />
</div>
```

#### 6.5 Actualizar Botón de Submit

```tsx
<button
  onClick={handleComplete}
  disabled={isSubmitting}
  className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
>
  {isSubmitting ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      {uploadProgress
        ? `Subiendo ${uploadProgress.current}/${uploadProgress.total}...`
        : 'Completando...'}
    </>
  ) : (
    <>
      <PartyPopper className="h-4 w-4" />
      Completar
    </>
  )}
</button>
```

#### 6.6 Actualizar hasContent Check

```typescript
const hasContent = notes.trim().length > 0 || links.length > 0 || pendingFiles.length > 0;
```

---

## Acceptance Criteria

### Feature 1: Sistema de Blockers
- [ ] Campo `blockerReason` agregado al schema
- [ ] Acción `addBlocker()` funciona (solo assignee/creator)
- [ ] Acción `removeBlocker()` funciona (solo assignee/creator)
- [ ] Badge naranja "Bloqueada" visible en TaskCard
- [ ] Razón del bloqueo visible en TaskCard
- [ ] Sección blocker en TaskDetailDialog
- [ ] Tarea bloqueada puede moverse libremente entre columnas

### Feature 2: Múltiples Actividades en Progreso
- [ ] Restricción Single In-Progress eliminada
- [ ] Usuario puede tener 2+ tareas en "En Progreso"
- [ ] Cada tarea mantiene su propio `startedAt`
- [ ] Time tracking funciona independientemente por tarea

### Feature 3: Dashboard Multi-Actividad
- [ ] `TeamSlotData.inProgressTasks` es array
- [ ] TeamSlot muestra badge con cantidad de tareas (2+)
- [ ] Máximo 2 tareas visibles, luego "+N más"
- [ ] Indicador de blocker por tarea en lista
- [ ] Tiempo transcurrido por tarea

### Feature 4: Adjuntos al Completar Tarea
- [ ] `PendingFilePicker` integrado en CompleteTaskModal
- [ ] Estado `pendingFiles` y `uploadProgress` funcionan
- [ ] Archivos se suben a `/api/attachments/upload` después de completar
- [ ] Toast muestra resultado de uploads (éxito/parcial/error)
- [ ] Warning de confirmación incluye archivos pendientes
- [ ] Botón muestra progreso de upload

---

## Files to Modify

| Archivo | Cambios |
|---------|---------|
| `db/schema.ts` | +1 campo (blockerReason) |
| `app/actions/tasks.ts` | +2 funciones, -1 bloque restricción |
| `app/actions/kanban.ts` | +blockerReason en tipos/queries |
| `app/actions/team.ts` | Cambiar a array de tareas |
| `app/globals.css` | +4 variables CSS blocker |
| `components/task-card.tsx` | +visualización blocker |
| `components/task-detail-dialog.tsx` | +sección blocker |
| `components/team-slot.tsx` | +multi-actividad |
| `components/complete-task-modal.tsx` | +PendingFilePicker, upload logic |

---

## Implementation Order

```
1. Migración BD (blockerReason)
2. Eliminar restricción Single In-Progress
3. Acciones addBlocker/removeBlocker
4. Actualizar tipos (KanbanTaskData, TeamSlotData)
5. Variables CSS para blockers
6. TaskCard con visualización de blocker
7. TaskDetailDialog con sección blocker
8. TeamSlot multi-actividad
9. CompleteTaskModal con adjuntos
```

---

## Verification Plan

1. **Blocker Flow:**
   - Abrir tarea → Agregar blocker con razón → Verificar badge naranja en Kanban
   - Arrastrar tarea bloqueada a otra columna → Debe moverse libremente
   - Quitar blocker → Badge desaparece

2. **Multi-Actividad:**
   - Mover 3 tareas a "En Progreso" → Las 3 deben permanecer
   - Verificar que cada una tiene su propio startedAt
   - Time tracking funciona independientemente

3. **Dashboard:**
   - Usuario con 1 tarea → Vista normal
   - Usuario con 3 tareas → Ver 2 + "+1 más"
   - Tarea bloqueada → Icono naranja en lista

4. **Tests E2E:**
   - Actualizar `task-time-tracking.spec.ts` si depende de Single In-Progress
   - Agregar test para blocker flow

5. **Adjuntos al Completar:**
   - Abrir CompleteTaskModal → Agregar archivo → Completar
   - Verificar archivo aparece en attachments de la tarea
   - Probar upload parcial (1 éxito, 1 error) → Warning correcto

---

## References

### Internal
- Schema actual: `db/schema.ts:54-79`
- Task actions: `app/actions/tasks.ts`
- TeamSlot: `components/team-slot.tsx`
- TaskCard: `components/task-card.tsx`
- CreateTaskDialog (patrón de adjuntos): `components/create-task-dialog.tsx:21-116`
- CompleteTaskModal: `components/complete-task-modal.tsx`
- PendingFilePicker (reutilizar): `components/pending-file-picker.tsx`
- API upload: `/api/attachments/upload`

### Learnings Aplicados
- **Anti-patrón de tipos duplicados**: Usar campo simple `blockerReason` en lugar de tabla separada
- **N+1 Query**: TeamSlot query debe incluir todos los campos necesarios en una sola query
- **UTC Bug**: No aplica aquí (no combinamos date+time para blockers)
